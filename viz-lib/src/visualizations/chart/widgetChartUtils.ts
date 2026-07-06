import { prepareCustomChartData } from "./plotly/customChartUtils";
import getChartData from "./getChartData";
import { Plotly } from "./plotly";

export function prepareWidgetData(rows: any, columns: any, options: any) {
  const chartData = prepareCustomChartData(getChartData(rows, options));
  return {
    rows,
    columns,
    x: chartData.x,
    ys: chartData.ys,
  };
}

export function createWidgetRenderer(
  html: string,
  css: string,
  js: string,
  logErrorsToConsole = false
) {
  let executeJs = () => {};
  try {
    // @ts-expect-error ts-migrate(2322) FIXME: Type 'Function' is not assignable to type '() => v... Remove this comment to see the full error message
    executeJs = new Function("element, rows, columns, x, ys, Plotly", js); // eslint-disable-line no-new-func
  } catch (err) {
    if (logErrorsToConsole) {
      console.log(`Error while parsing widget JS: ${err}`); // eslint-disable-line no-console
    }
  }

  return (element: HTMLElement, data: { rows: any; columns: any; x: any; ys: any }) => {
    try {
      Plotly.purge(element);
      element.innerHTML = "";

      if (css) {
        const styleEl = document.createElement("style");
        styleEl.textContent = css;
        element.appendChild(styleEl);
      }

      if (html) {
        const root = document.createElement("div");
        root.className = "widget-root";
        root.innerHTML = html;
        element.appendChild(root);
      }

      // element は Custom chart と同じ表示領域コンテナ
      // @ts-expect-error ts-migrate(2554) FIXME: Expected 0 arguments, but got 6.
      executeJs(element, data.rows, data.columns, data.x, data.ys, Plotly);
    } catch (err) {
      if (logErrorsToConsole) {
        console.log(`Error while executing widget: ${err}`); // eslint-disable-line no-console
      }
    }
  };
}
