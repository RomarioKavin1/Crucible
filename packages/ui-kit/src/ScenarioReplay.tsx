"use client";
import { useEffect, useRef } from "react";
import { createChart, type IChartApi, type ISeriesApi, type CandlestickData, type Time } from "lightweight-charts";
import type { Tick, Fill } from "@crucible/core";

export interface ScenarioReplayProps {
  ticks: Tick[];
  fills?: Fill[];
  currentTickIndex?: number;
  height?: number;
}

export function ScenarioReplay({ ticks, fills = [], currentTickIndex, height = 400 }: ScenarioReplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height,
      layout: { background: { color: "transparent" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "#1e293b" }, horzLines: { color: "#1e293b" } },
      timeScale: { timeVisible: true, secondsVisible: true },
    });
    const series = chart.addCandlestickSeries({
      upColor: "#22c55e", downColor: "#ef4444",
      borderUpColor: "#22c55e", borderDownColor: "#ef4444",
      wickUpColor: "#22c55e", wickDownColor: "#ef4444",
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const resize = () => containerRef.current && chart.applyOptions({ width: containerRef.current.clientWidth });
    resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      chart.remove();
    };
  }, [height]);

  useEffect(() => {
    if (!seriesRef.current) return;
    const upTo = currentTickIndex !== undefined ? currentTickIndex + 1 : ticks.length;
    const data: CandlestickData[] = ticks.slice(0, upTo).map((t) => ({
      time: (Math.floor(new Date(t.ts).getTime() / 1000) as unknown) as Time,
      open: t.mid, high: Math.max(t.mid, t.ask), low: Math.min(t.mid, t.bid), close: t.last,
    }));
    seriesRef.current.setData(data);

    const markers = fills
      .filter((f) => currentTickIndex === undefined || f.tick <= currentTickIndex)
      .map((f) => ({
        time: (Math.floor(new Date(f.ts).getTime() / 1000) as unknown) as Time,
        position: f.side === "buy" ? ("belowBar" as const) : ("aboveBar" as const),
        color: f.side === "buy" ? "#22c55e" : "#ef4444",
        shape: (f.side === "buy" ? "arrowUp" : "arrowDown") as "arrowUp" | "arrowDown",
        text: `${f.side.toUpperCase()} ${f.qty}@${f.price.toFixed(2)}`,
      }));
    seriesRef.current.setMarkers(markers);
  }, [ticks, fills, currentTickIndex]);

  return <div ref={containerRef} style={{ width: "100%", height }} />;
}
