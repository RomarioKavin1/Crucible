"use client";
import { useEffect, useRef, useState } from "react";
import {
  createChart,
  CrosshairMode,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  type MouseEventParams,
} from "lightweight-charts";
import type { Tick, Fill } from "@crucible/core";

export interface ScenarioReplayProps {
  ticks: Tick[];
  fills?: Fill[];
  currentTickIndex?: number;
  height?: number;
}

interface HoverState {
  visible: boolean;
  x: number;
  y: number;
  time?: number;
  price?: number;
  tickFills: Fill[];
}

export function ScenarioReplay({ ticks, fills = [], currentTickIndex, height = 400 }: ScenarioReplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [hover, setHover] = useState<HoverState>({ visible: false, x: 0, y: 0, tickFills: [] });

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { color: "transparent" },
        textColor: "#5e6b80",
        fontFamily: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "#1f2a3d33", style: LineStyle.Dotted },
        horzLines: { color: "#1f2a3d33", style: LineStyle.Dotted },
      },
      timeScale: { timeVisible: true, secondsVisible: true, borderColor: "#1f2a3d" },
      rightPriceScale: { borderColor: "#1f2a3d" },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: "#22d3ee66", width: 1, labelBackgroundColor: "#0f1623" },
        horzLine: { color: "#22d3ee66", width: 1, labelBackgroundColor: "#0f1623" },
      },
      handleScale: { mouseWheel: true, pinch: true },
    });
    const series = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#ef4444",
      borderUpColor: "#10b981",
      borderDownColor: "#ef4444",
      wickUpColor: "#10b981",
      wickDownColor: "#ef4444",
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
    if (!seriesRef.current || !chartRef.current) return;
    const upTo = currentTickIndex !== undefined ? currentTickIndex + 1 : ticks.length;
    const data: CandlestickData[] = ticks.slice(0, upTo).map((t) => {
      const open = t.mid;
      const close = t.last;
      const high = Math.max(open, close, t.ask);
      const low = Math.min(open, close, t.bid);
      return {
        time: (Math.floor(new Date(t.ts).getTime() / 1000) as unknown) as Time,
        open,
        high,
        low,
        close,
      };
    });
    seriesRef.current.setData(data);

    const visibleFills = fills.filter((f) => currentTickIndex === undefined || f.tick <= currentTickIndex);
    // Clean unlabeled markers — text is shown via hover tooltip instead so the
    // chart stays readable even with dozens of trades clustered on adjacent ticks.
    const markers = visibleFills.map((f) => ({
      time: (Math.floor(new Date(f.ts).getTime() / 1000) as unknown) as Time,
      position: f.side === "buy" ? ("belowBar" as const) : ("aboveBar" as const),
      color: f.side === "buy" ? "#10b981" : "#ef4444",
      shape: (f.side === "buy" ? "arrowUp" : "arrowDown") as "arrowUp" | "arrowDown",
    }));
    seriesRef.current.setMarkers(markers);

    const fillsByTime = new Map<number, Fill[]>();
    for (const f of visibleFills) {
      const ts = Math.floor(new Date(f.ts).getTime() / 1000);
      if (!fillsByTime.has(ts)) fillsByTime.set(ts, []);
      fillsByTime.get(ts)!.push(f);
    }

    const handler = (param: MouseEventParams) => {
      if (!param.time || !param.point || !containerRef.current) {
        setHover((h) => (h.visible ? { ...h, visible: false } : h));
        return;
      }
      const ts = Number(param.time);
      const candle = param.seriesData.get(seriesRef.current!) as { close?: number } | undefined;
      setHover({
        visible: true,
        x: param.point.x,
        y: param.point.y,
        time: ts,
        price: candle?.close,
        tickFills: fillsByTime.get(ts) ?? [],
      });
    };
    chartRef.current.subscribeCrosshairMove(handler);
    return () => {
      chartRef.current?.unsubscribeCrosshairMove(handler);
    };
  }, [ticks, fills, currentTickIndex]);

  return (
    <div ref={containerRef} style={{ width: "100%", height, position: "relative" }}>
      {hover.visible && (
        <div
          className="pointer-events-none absolute z-10 bg-[#070b14]/95 border border-[#1f2a3d] rounded px-2.5 py-1.5 font-mono text-[10px] text-[#e5e9f0] shadow-lg shadow-black/40"
          style={{
            left: Math.min(hover.x + 14, (containerRef.current?.clientWidth ?? 0) - 220),
            top: Math.max(hover.y - 8, 4),
            minWidth: 160,
          }}
        >
          {hover.time && (
            <div className="text-[#5e6b80] uppercase tracking-[0.18em] mb-1">
              {new Date(hover.time * 1000).toISOString().slice(11, 19)}
            </div>
          )}
          {hover.price !== undefined && (
            <div className="tabular-nums">
              price <span className="text-[#22d3ee]">${hover.price.toFixed(2)}</span>
            </div>
          )}
          {hover.tickFills.length > 0 && (
            <div className="mt-1 pt-1 border-t border-[#1f2a3d] space-y-0.5">
              {hover.tickFills.map((f, i) => (
                <div key={i} className="tabular-nums" style={{ color: f.side === "buy" ? "#10b981" : "#ef4444" }}>
                  {f.side === "buy" ? "▲" : "▼"} {f.side.toUpperCase()} {f.qty} @ ${f.price.toFixed(2)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
