import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { LineChart } from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  MarkPointComponent,
  AriaComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

// Register only the components we need
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  MarkPointComponent,
  AriaComponent,
  CanvasRenderer,
]);

export function LatencyChart({
  points,
  failures,
}: {
  points: [number, number][];
  failures: [number, number][];
}) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    // Initialize chart
    chartInstance.current = echarts.init(chartRef.current);

    const option = {
      animation: false,
      backgroundColor: "#0A1713",
      aria: { enabled: true },
      grid: { left: 52, right: 14, top: 16, bottom: 26 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "#17382E",
        textStyle: { color: "#E6F6EE" },
      },
       xAxis: {
        type: "value", // Changed from "time" to "value"
        axisLine: { lineStyle: { color: "#17382E" } },
        axisLabel: { color: "#8FB3A4" },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: "#8FB3A4", formatter: "{value} ms" },
        splitNumber: 3,
        splitLine: { lineStyle: { color: "#17382E" } },
      },
      series: [
        {
          type: "line",
          data: points,
          showSymbol: false,
          lineStyle: { color: "#5EE6A8", width: 2.5 },
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(94,230,168,0.28)" },
                { offset: 1, color: "rgba(94,230,168,0)" },
              ],
            },
          },
          markPoint: {
            symbolSize: 10,
            itemStyle: { color: "#FF6B6B" },
            data: failures.map(([t, v]) => ({ coord: [t, v] })),
          },
        },
      ],
    };

    chartInstance.current.setOption(option);

    // Handle resize
    const observer = new ResizeObserver(() => {
      chartInstance.current?.resize();
    });
    observer.observe(chartRef.current);

    return () => {
      observer.disconnect();
      chartInstance.current?.dispose();
    };
  }, [points, failures]); // Re-render when data changes

  return <div ref={chartRef} className="h-50 w-full" />;
}