/* eslint-disable react/prop-types */
import React from "react";
import createTabbedEditor from "@/components/visualizations/editor/createTabbedEditor";

import GeneralSettings from "./GeneralSettings";
import XAxisSettings from "./XAxisSettings";
import YAxisSettings from "./YAxisSettings";
import SeriesSettings from "./SeriesSettings";
import ColorsSettings from "./ColorsSettings";
import DataLabelsSettings from "./DataLabelsSettings";
import CustomChartSettings from "./CustomChartSettings";
import WidgetChartSettings from "./WidgetChartSettings";

import "./editor.less";

const isCustomChart = (options: any) => options.globalSeriesType === "custom";
const isWidgetChart = (options: any) => options.globalSeriesType === "widget";
const isCodeBasedChart = (options: any) => isCustomChart(options) || isWidgetChart(options);
const isPieChart = (options: any) => options.globalSeriesType === "pie";

export default createTabbedEditor([
  {
    key: "General",
    title: "General",
    component: (props: any) => (
      <React.Fragment>
        <GeneralSettings {...props} />
        {isCustomChart(props.options) && <CustomChartSettings {...props} />}
        {isWidgetChart(props.options) && <WidgetChartSettings {...props} />}
      </React.Fragment>
    ),
  },
  {
    key: "XAxis",
    title: ({ swappedAxes }: any) => (!swappedAxes ? "X Axis" : "Y Axis"),
    component: XAxisSettings,
    isAvailable: (options: any) => !isCodeBasedChart(options) && !isPieChart(options),
  },
  {
    key: "YAxis",
    title: ({ swappedAxes }: any) => (!swappedAxes ? "Y Axis" : "X Axis"),
    component: YAxisSettings,
    isAvailable: (options: any) => !isCodeBasedChart(options) && !isPieChart(options),
  },
  {
    key: "Series",
    title: "Series",
    component: SeriesSettings,
    isAvailable: (options: any) => !isCodeBasedChart(options),
  },
  {
    key: "Colors",
    title: "Colors",
    component: ColorsSettings,
    isAvailable: (options: any) => !isCodeBasedChart(options),
  },
  {
    key: "DataLabels",
    title: "Data Labels",
    component: DataLabelsSettings,
    isAvailable: (options: any) => !isCodeBasedChart(options),
  },
]);
