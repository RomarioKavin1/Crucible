"use client";
import React, { useEffect, useRef } from "react";
import { createChart, type IChartApi, type ISeriesApi } from "lightweight-charts";

export interface ReplayPoint {
  time: number; // unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

export function ScenarioReplay({ points }: { points: ReplayPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const chart = createChart(ref.current, { height: 360 });
    const series = chart.addCandlestickSeries();
    chartRef.current = chart;
    seriesRef.current = series;
    return () => {
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (seriesRef.current) {
      seriesRef.current.setData(points as any);
    }
  }, [points]);

  return <div ref={ref} style={{ width: "100%" }} />;
}
