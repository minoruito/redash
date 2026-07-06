import React from "react";
import { RendererPropTypes } from "@/visualizations/prop-types";

import PlotlyChart from "./PlotlyChart";
import CustomPlotlyChart from "./CustomPlotlyChart";
import WidgetChart from "./WidgetChart";
import { visualizationsSettings } from "@/visualizations/visualizationsSettings";

import "./renderer.less";

export default function Renderer({ options, ...props }: any) {
  if (!visualizationsSettings.allowCustomJSVisualizations) {
    return <PlotlyChart options={options} {...props} />;
  }
  if (options.globalSeriesType === "custom") {
    return <CustomPlotlyChart options={options} {...props} />;
  }
  if (options.globalSeriesType === "widget") {
    return <WidgetChart options={options} {...props} />;
  }
  return <PlotlyChart options={options} {...props} />;
}

Renderer.propTypes = RendererPropTypes;
