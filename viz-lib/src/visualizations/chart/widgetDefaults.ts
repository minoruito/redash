import { isNil, trimStart } from "lodash";

export const DEFAULT_WIDGET_HTML = trimStart(`
<div id="widget-content"></div>
`);

export const DEFAULT_WIDGET_CSS = trimStart(`
#widget-content {
  position: absolute;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
}
`);

export const DEFAULT_WIDGET_JS = trimStart(`
// element は Custom chart と同じ表示領域コンテナ
// Plotly グラフは element または #widget-content に描画
const chartArea = element.querySelector("#widget-content") || element;
chartArea.textContent = "Row count: " + (rows || []).length;
`);

export function applyWidgetDefaults(options: any) {
  if (options.globalSeriesType !== "widget") {
    return options;
  }

  return {
    ...options,
    widgetHtml: isNil(options.widgetHtml) ? DEFAULT_WIDGET_HTML : options.widgetHtml,
    widgetCss: isNil(options.widgetCss) ? DEFAULT_WIDGET_CSS : options.widgetCss,
    widgetJs: isNil(options.widgetJs) ? DEFAULT_WIDGET_JS : options.widgetJs,
  };
}
