import json
import logging
import re

import requests
from flask import request
from flask_restful import abort

from redash.handlers.base import BaseResource, get_object_or_404
from redash.models import DataSource
from redash.permissions import require_access, require_permission, view_only
from redash.query_runner import NotSupported

logger = logging.getLogger(__name__)

SCHEMA_MAX_CHARS = 80000


class AiSettingKey:
    API_URL = "ai_api_url"
    API_KEY = "ai_api_key"
    MODEL = "ai_model"


class MessageRole:
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


SYSTEM_PROMPT = """あなたは指定データソースのスキーマだけを使ってクエリを書くアシスタントです。
厳守事項:
- 与えられたスキーマに存在するテーブル名とカラム名だけを使う
- スキーマに無い名前は、一般的な名前（users, orders, sales など）でも絶対に作らない
- テーブル名はスキーマの表記をそのまま使う（schema.table 形式ならその通り）
- スキーマが空、または該当テーブルが無い場合は query を空文字にし、message に理由を日本語で書く
- 回答は次のJSONのみ。前後に文章を付けない
{"query": "クエリ本文", "message": "日本語の短い説明"}"""


def chat_completions_url(api_url):
    url = (api_url or "").strip().rstrip("/")
    if url.endswith("/chat/completions"):
        return url
    if url.endswith("/v1"):
        return "{}/chat/completions".format(url)
    return "{}/v1/chat/completions".format(url)


def extract_query_payload(content):
    text = (content or "").strip()
    if not text:
        return "", ""

    candidates = [text]
    fenced_json = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if fenced_json:
        candidates.insert(0, fenced_json.group(1).strip())

    for candidate in candidates:
        try:
            parsed = json.loads(candidate)
            if isinstance(parsed, dict) and "query" in parsed:
                return (parsed.get("query") or "").strip(), (parsed.get("message") or "").strip()
        except (TypeError, ValueError):
            continue

    sql_block = re.search(r"```(?:sql|SQL)\s*(.*?)```", text, re.DOTALL)
    if sql_block:
        explanation = re.sub(r"```(?:sql|SQL)\s*.*?```", "", text, flags=re.DOTALL).strip()
        return sql_block.group(1).strip(), explanation

    generic_block = re.search(r"```\s*(.*?)```", text, re.DOTALL)
    if generic_block:
        explanation = re.sub(r"```\s*.*?```", "", text, flags=re.DOTALL).strip()
        return generic_block.group(1).strip(), explanation

    return text, ""


def format_table_line(table):
    name = table.get("name") or ""
    cols = []
    for col in table.get("columns") or []:
        if isinstance(col, dict):
            col_name = col.get("name") or ""
            col_type = col.get("type") or ""
            cols.append("{} {}".format(col_name, col_type).strip() if col_type else col_name)
        else:
            cols.append(str(col))
    return "{} ({})".format(name, ", ".join(cols))


def schema_to_prompt_text(schema, prompt=""):
    tables = list(schema or [])
    if not tables:
        return "(なし)"

    full = "\n".join(format_table_line(table) for table in tables)
    if len(full) <= SCHEMA_MAX_CHARS:
        return full

    names = [table.get("name") or "" for table in tables]
    text = "テーブル一覧:\n{}\n\nカラム定義:\n".format(", ".join(names))
    tokens = set(token.lower() for token in re.findall(r"[A-Za-z0-9_]+", prompt or "") if len(token) >= 2)

    def match_score(table):
        name = (table.get("name") or "").lower()
        if any(token in name for token in tokens):
            return 0
        for col in table.get("columns") or []:
            col_name = (col.get("name") if isinstance(col, dict) else str(col)).lower()
            if any(token in col_name for token in tokens):
                return 1
        return 2

    for table in sorted(tables, key=match_score):
        line = format_table_line(table)
        if len(text) + len(line) + 1 > SCHEMA_MAX_CHARS:
            break
        text += line + "\n"
    return text


def load_data_source_schema(data_source, fallback_schema):
    schema = data_source.get_cached_schema()
    if schema:
        return schema
    try:
        return data_source.get_schema()
    except NotSupported:
        return fallback_schema or []
    except Exception:
        logger.exception("Failed to load schema for data_source %s", data_source.id)
        return fallback_schema or []


class AiGenerateQueryResource(BaseResource):
    @require_permission("create_query")
    def post(self):
        req = request.get_json(True) or {}
        prompt = (req.get("prompt") or "").strip()
        if not prompt:
            abort(400, message="要求を入力してください。")

        org = self.current_org
        api_url = (org.get_setting(AiSettingKey.API_URL, raise_on_missing=False) or "").strip()
        api_key = (org.get_setting(AiSettingKey.API_KEY, raise_on_missing=False) or "").strip()
        model = (org.get_setting(AiSettingKey.MODEL, raise_on_missing=False) or "").strip()

        if not api_url or not model:
            abort(400, message="AI設定が未設定です。設定の「AI Setting」タブで接続情報を保存してください。")

        history = req.get("messages") or []
        current_query = req.get("current_query") or ""
        fallback_schema = req.get("schema") if isinstance(req.get("schema"), list) else []
        syntax = req.get("syntax") or "sql"
        data_source_name = ""
        data_source_type = ""
        schema = fallback_schema

        data_source_id = req.get("data_source_id")
        if data_source_id:
            data_source = get_object_or_404(DataSource.get_by_id_and_org, data_source_id, org)
            require_access(data_source, self.current_user, view_only)
            data_source_name = data_source.name
            data_source_type = data_source.type
            schema = load_data_source_schema(data_source, fallback_schema)
            try:
                syntax = getattr(data_source.query_runner, "syntax", None) or syntax
            except Exception:
                pass

        schema_text = schema_to_prompt_text(schema, prompt)
        context = (
            "データソース: {} ({})\n構文: {}\n\n現在のクエリ:\n{}\n\nテーブル定義:\n{}".format(
                data_source_name or "(未選択)",
                data_source_type or "(不明)",
                syntax,
                current_query or "(空)",
                schema_text,
            )
        )

        messages = [
            {"role": MessageRole.SYSTEM, "content": SYSTEM_PROMPT + "\n\n" + context},
        ]
        for item in history[-20:]:
            role = item.get("role")
            content = (item.get("content") or "").strip()
            if role in (MessageRole.USER, MessageRole.ASSISTANT) and content:
                messages.append({"role": role, "content": content})
        messages.append({"role": MessageRole.USER, "content": prompt})

        headers = {"Content-Type": "application/json"}
        if api_key:
            headers["Authorization"] = "Bearer {}".format(api_key)

        try:
            response = requests.post(
                chat_completions_url(api_url),
                headers=headers,
                json={"model": model, "messages": messages, "temperature": 0.1},
                timeout=90,
            )
        except requests.RequestException:
            logger.exception("AI API request failed")
            abort(502, message="AIサービスに接続できませんでした。")

        if response.status_code >= 400:
            logger.warning("AI API error status=%s body=%s", response.status_code, response.text[:500])
            abort(502, message="AIサービスがエラーを返しました。（HTTP {}）".format(response.status_code))

        try:
            payload = response.json()
            content = payload["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError):
            abort(502, message="AIサービスの応答を解釈できませんでした。")

        query_text, message = extract_query_payload(content)
        if not query_text and not message:
            abort(502, message="AIがクエリを返せませんでした。")

        self.record_event({"action": "generate", "object_type": "ai_query"})
        return {"query": query_text, "message": message or "クエリを生成しました。"}
