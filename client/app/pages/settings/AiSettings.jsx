import React from "react";
import PropTypes from "prop-types";

import Button from "antd/lib/button";
import Form from "antd/lib/form";
import Input from "antd/lib/input";
import Skeleton from "antd/lib/skeleton";
import routeWithUserSession from "@/components/ApplicationArea/routeWithUserSession";
import wrapSettingsTab from "@/components/SettingsWrapper";

import routes from "@/services/routes";
import { getHorizontalFormProps, getHorizontalFormItemWithoutLabelProps } from "@/styles/formStyle";

import useOrganizationSettings from "./hooks/useOrganizationSettings";
import { SettingsEditorPropTypes, SettingsEditorDefaultProps } from "./components/prop-types";

const AiSettingKey = {
  API_URL: "ai_api_url",
  API_KEY: "ai_api_key",
  MODEL: "ai_model",
};

function ConnectionSettings({ values, onChange, loading }) {
  return (
    <React.Fragment>
      <h3 className="m-t-0">AI接続</h3>
      <p className="text-muted">
        OpenAI互換の Chat Completions API（OpenAI、Azure OpenAI 互換エンドポイント、Ollama など）に接続します。
      </p>
      <hr />
      <Form.Item label="API URL">
        {loading ? (
          <Skeleton.Input style={{ width: 400 }} active />
        ) : (
          <Input
            placeholder="https://api.openai.com/v1"
            value={values[AiSettingKey.API_URL]}
            onChange={e => onChange({ [AiSettingKey.API_URL]: e.target.value })}
            data-test="AiApiUrl"
          />
        )}
      </Form.Item>
      <Form.Item label="APIキー">
        {loading ? (
          <Skeleton.Input style={{ width: 400 }} active />
        ) : (
          <Input.Password
            placeholder="sk-..."
            value={values[AiSettingKey.API_KEY]}
            onChange={e => onChange({ [AiSettingKey.API_KEY]: e.target.value })}
            data-test="AiApiKey"
          />
        )}
      </Form.Item>
      <Form.Item label="モデル名">
        {loading ? (
          <Skeleton.Input style={{ width: 400 }} active />
        ) : (
          <Input
            placeholder="gpt-4o-mini"
            value={values[AiSettingKey.MODEL]}
            onChange={e => onChange({ [AiSettingKey.MODEL]: e.target.value })}
            data-test="AiModel"
          />
        )}
      </Form.Item>
    </React.Fragment>
  );
}

ConnectionSettings.propTypes = SettingsEditorPropTypes;
ConnectionSettings.defaultProps = SettingsEditorDefaultProps;

function AiSettings({ onError }) {
  const { currentValues, isLoading, isSaving, handleSubmit, handleChange } = useOrganizationSettings({ onError });
  return (
    <div className="row" data-test="AiSettings">
      <div className="m-r-20 m-l-20">
        <Form {...getHorizontalFormProps()} onFinish={handleSubmit}>
          <ConnectionSettings loading={isLoading} values={currentValues} onChange={handleChange} />
          <Form.Item {...getHorizontalFormItemWithoutLabelProps()}>
            {isLoading ? (
              <Skeleton.Button active />
            ) : (
              <Button type="primary" htmlType="submit" loading={isSaving} data-test="AiSettingsSaveButton">
                保存
              </Button>
            )}
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}

AiSettings.propTypes = {
  onError: PropTypes.func,
};

AiSettings.defaultProps = {
  onError: () => {},
};

const AiSettingsPage = wrapSettingsTab(
  "Settings.AI",
  {
    permission: "admin",
    title: "AI Setting",
    path: "settings/ai",
    order: 7,
  },
  AiSettings
);

routes.register(
  "Settings.AI",
  routeWithUserSession({
    path: "/settings/ai",
    title: "AI Setting",
    render: pageProps => <AiSettingsPage {...pageProps} />,
  })
);
