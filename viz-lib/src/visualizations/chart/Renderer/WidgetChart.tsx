import React, { useState, useEffect, useMemo } from "react";
import { RendererPropTypes } from "@/visualizations/prop-types";

import resizeObserver from "@/services/resizeObserver";

import getOptions from "../getOptions";
import { Plotly } from "../plotly";
import { createWidgetRenderer, prepareWidgetData } from "../widgetChartUtils";

export default function WidgetChart({ options: optionsProp, data }: any) {
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const options = useMemo(() => getOptions(optionsProp), [optionsProp]);

  const renderWidget = useMemo(
    () =>
      createWidgetRenderer(
        options.widgetHtml || "",
        options.widgetCss || "",
        options.widgetJs || "",
        options.enableConsoleLogs
      ),
    [options.widgetHtml, options.widgetCss, options.widgetJs, options.enableConsoleLogs]
  );

  const widgetData = useMemo(
    () => prepareWidgetData(data.rows, data.columns, options),
    [options, data.rows, data.columns]
  );

  useEffect(() => {
    if (container) {
      const render = () => {
        Plotly.purge(container);
        renderWidget(container, widgetData);
      };

      render();

      const unwatch = resizeObserver(container, render);
      return () => {
        unwatch();
        Plotly.purge(container);
      };
    }
  }, [container, widgetData, renderWidget]);

  return <div className="chart-visualization-container" ref={setContainer} />;
}

WidgetChart.propTypes = RendererPropTypes;
