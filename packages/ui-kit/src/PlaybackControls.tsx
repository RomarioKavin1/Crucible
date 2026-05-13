"use client";
import { useCallback, useRef, useState } from "react";

export interface PlaybackControlsProps {
  currentTick: number;
  totalTicks: number;
  isPlaying: boolean;
  speed: number;
  onPlayToggle: () => void;
  onSeek: (tick: number) => void;
  onStep: (delta: number) => void;
  onSpeedChange: (speed: number) => void;
  /** Tick indexes where a buy fill happened — rendered as small green dots on the scrubber. */
  buyTicks?: number[];
  /** Tick indexes where a sell fill happened — rendered as small red dots on the scrubber. */
  sellTicks?: number[];
  /** Tick indexes where news arrived — rendered as small amber dots on the scrubber. */
  newsTicks?: number[];
}

const SPEEDS = [0.5, 1, 2, 4, 8, 16];

export function PlaybackControls({
  currentTick, totalTicks, isPlaying, speed,
  onPlayToggle, onSeek, onStep, onSpeedChange,
  buyTicks = [], sellTicks = [], newsTicks = [],
}: PlaybackControlsProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const tickFromEvent = useCallback((clientX: number): number => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * Math.max(0, totalTicks - 1));
  }, [totalTicks]);

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onSeek(tickFromEvent(e.clientX));
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    onSeek(tickFromEvent(e.clientX));
  };
  const handlePointerUp = (e: React.PointerEvent) => {
    setDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const ratio = totalTicks > 1 ? currentTick / (totalTicks - 1) : 0;
  const atEnd = currentTick >= totalTicks - 1;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#0a0e17] border-t border-[#1c2538]">
      {/* Step back */}
      <button
        type="button"
        onClick={() => onStep(-1)}
        disabled={currentTick <= 0}
        className="text-[#aab2c5] hover:text-[#e6e9f0] disabled:text-[#3a4456] disabled:cursor-not-allowed transition-colors p-1"
        aria-label="Step back"
      >
        <Icon path="M11 19V5l-7 7 7 7zM18 19V5h-2v14h2z" />
      </button>

      {/* Play / Pause */}
      <button
        type="button"
        onClick={onPlayToggle}
        className="bg-[#22d3ee] hover:bg-[#67e8f9] text-[#0a0e17] rounded-full w-9 h-9 flex items-center justify-center transition-colors shadow-[0_0_0_4px_#22d3ee15]"
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <Icon path="M6 5h4v14H6zM14 5h4v14h-4z" size={14} />
        ) : (
          <Icon path="M8 5v14l11-7z" size={14} />
        )}
      </button>

      {/* Step forward */}
      <button
        type="button"
        onClick={() => onStep(1)}
        disabled={atEnd}
        className="text-[#aab2c5] hover:text-[#e6e9f0] disabled:text-[#3a4456] disabled:cursor-not-allowed transition-colors p-1"
        aria-label="Step forward"
      >
        <Icon path="M13 5v14l7-7-7-7zM6 5v14h2V5H6z" />
      </button>

      {/* Scrubber */}
      <div className="flex-1 relative h-9 flex items-center">
        <div
          ref={trackRef}
          className="relative w-full h-1.5 bg-[#1c2538] rounded-full cursor-pointer touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* Played portion */}
          <div
            className="absolute top-0 left-0 h-full bg-[#22d3ee] rounded-full pointer-events-none"
            style={{ width: `${ratio * 100}%` }}
          />
          {/* Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-[#22d3ee] border-2 border-[#0a0e17] pointer-events-none transition-transform"
            style={{ left: `calc(${ratio * 100}% - 7px)`, transform: `translateY(-50%) scale(${dragging ? 1.2 : 1})` }}
          />
          {/* Event marks below the track */}
          <div className="absolute -bottom-2 left-0 right-0 h-2 pointer-events-none">
            {buyTicks.map((t, i) => (
              <Mark key={`b${i}`} tick={t} totalTicks={totalTicks} color="#10b981" />
            ))}
            {sellTicks.map((t, i) => (
              <Mark key={`s${i}`} tick={t} totalTicks={totalTicks} color="#ef4444" />
            ))}
            {newsTicks.map((t, i) => (
              <Mark key={`n${i}`} tick={t} totalTicks={totalTicks} color="#fbbf24" />
            ))}
          </div>
        </div>
      </div>

      {/* Tick counter */}
      <div className="font-mono text-[12px] text-[#aab2c5] tabular-nums whitespace-nowrap min-w-[68px] text-right">
        {currentTick.toString().padStart(String(totalTicks - 1).length, "0")}<span className="text-[#6b7691]"> / {totalTicks - 1}</span>
      </div>

      {/* Speed selector */}
      <div className="flex items-center bg-[#131b2c] border border-[#1c2538] rounded-md overflow-hidden">
        {SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSpeedChange(s)}
            className={`px-2 py-1 text-[11px] font-mono transition-colors ${
              speed === s
                ? "bg-[#22d3ee15] text-[#22d3ee]"
                : "text-[#6b7691] hover:text-[#e6e9f0]"
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}

function Mark({ tick, totalTicks, color }: { tick: number; totalTicks: number; color: string }) {
  const left = totalTicks > 1 ? (tick / (totalTicks - 1)) * 100 : 0;
  return (
    <span
      className="absolute top-0 w-1 h-1 rounded-full"
      style={{ left: `calc(${left}% - 2px)`, background: color, boxShadow: `0 0 4px ${color}` }}
    />
  );
}

function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d={path} />
    </svg>
  );
}
