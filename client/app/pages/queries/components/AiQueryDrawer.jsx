import { get } from "lodash";
import React, { useCallback, useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import Button from "antd/lib/button";
import Drawer from "antd/lib/drawer";
import Input from "antd/lib/input";
import Spin from "antd/lib/spin";
import Link from "@/components/Link";
import { currentUser } from "@/services/auth";
import notification from "@/services/notification";
import AiQuery from "@/services/aiQuery";

import "./AiQueryDrawer.less";

export const AiMessageRole = {
  USER: "user",
  ASSISTANT: "assistant",
};

function getErrorMessage(error) {
  return get(error, "response.data.message") || "クエリの生成に失敗しました。";
}

export default function AiQueryDrawer({
  visible,
  currentQuery,
  dataSourceId,
  schema,
  syntax,
  onClose,
  onApplyQuery,
}) {
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, isGenerating, visible]);

  const sendPrompt = useCallback(() => {
    const text = prompt.trim();
    if (!text || isGenerating) {
      return;
    }

    const history = messages.map(item => ({ role: item.role, content: item.content }));
    setPrompt("");
    setMessages(current => [...current, { role: AiMessageRole.USER, content: text }]);
    setIsGenerating(true);

    AiQuery.generateQuery({
      prompt: text,
      messages: history,
      current_query: currentQuery || "",
      data_source_id: dataSourceId,
      schema,
      syntax: syntax || "sql",
    })
      .then(data => {
        const queryText = data.query || "";
        const message = data.message || "クエリを生成しました。";
        setMessages(current => [
          ...current,
          { role: AiMessageRole.ASSISTANT, content: message, query: queryText },
        ]);
      })
      .catch(error => {
        const errorMessage = getErrorMessage(error);
        notification.error(errorMessage);
        setMessages(current => [...current, { role: AiMessageRole.ASSISTANT, content: errorMessage, isError: true }]);
      })
      .finally(() => setIsGenerating(false));
  }, [prompt, isGenerating, messages, currentQuery, dataSourceId, schema, syntax]);

  return (
    <Drawer
      title="AI Query"
      placement="right"
      visible={visible}
      onClose={onClose}
      width={420}
      className="ai-query-drawer"
      destroyOnClose={false}>
      <div className="ai-query-drawer-body">
        <div className="ai-query-drawer-messages" ref={listRef}>
          {messages.length === 0 && (
            <div className="ai-query-drawer-empty">
              作りたいクエリを日本語で入力してください。左のスキーマ（テーブル・カラム）を参照して生成します。
              {schema.length > 0 && <div className="m-t-10">読み込み済みテーブル: {schema.length} 件</div>}
              {schema.length === 0 && (
                <div className="m-t-10">スキーマ未取得です。左ペインのテーブル一覧が表示されてから送信してください。</div>
              )}
              {currentUser.isAdmin && (
                <div className="m-t-10">
                  接続設定は <Link href="settings/ai">AI Setting</Link> で行います。
                </div>
              )}
            </div>
          )}
          {messages.map((item, index) => (
            <div
              key={`ai-message-${index}`}
              className={`ai-query-drawer-message ai-query-drawer-message-${item.role}${
                item.isError ? " ai-query-drawer-message-error" : ""
              }`}>
              <div className="ai-query-drawer-message-content">{item.content}</div>
              {item.query && (
                <React.Fragment>
                  <pre className="ai-query-drawer-query">{item.query}</pre>
                  <Button
                    className="m-t-5"
                    data-test="AiQueryApplyButton"
                    onClick={() => onApplyQuery(item.query)}>
                    Apply
                  </Button>
                </React.Fragment>
              )}
            </div>
          ))}
          {isGenerating && (
            <div className="ai-query-drawer-loading">
              <Spin size="small" /> クエリを生成しています...
            </div>
          )}
        </div>
        <div className="ai-query-drawer-input">
          <Input.TextArea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="例: 月別の売上合計を出して"
            autoSize={{ minRows: 3, maxRows: 6 }}
            disabled={isGenerating}
            onPressEnter={e => {
              if (!e.shiftKey) {
                e.preventDefault();
                sendPrompt();
              }
            }}
            data-test="AiQueryPrompt"
          />
          <Button
            type="primary"
            className="m-t-10"
            block
            loading={isGenerating}
            disabled={!prompt.trim()}
            onClick={sendPrompt}
            data-test="AiQuerySendButton">
            送信
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

AiQueryDrawer.propTypes = {
  visible: PropTypes.bool,
  currentQuery: PropTypes.string,
  dataSourceId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  schema: PropTypes.array,
  syntax: PropTypes.string,
  onClose: PropTypes.func,
  onApplyQuery: PropTypes.func,
};

AiQueryDrawer.defaultProps = {
  visible: false,
  currentQuery: "",
  dataSourceId: null,
  schema: [],
  syntax: "sql",
  onClose: () => {},
  onApplyQuery: () => {},
};
