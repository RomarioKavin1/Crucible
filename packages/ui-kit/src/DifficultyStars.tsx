export interface DifficultyStarsProps {
  level: number;          // 1..5
  size?: "sm" | "md";
}

export function DifficultyStars({ level, size = "md" }: DifficultyStarsProps) {
  const clamped = Math.max(0, Math.min(5, Math.round(level)));
  const px = size === "sm" ? "text-[10px]" : "text-[12px]";
  return (
    <span className={`inline-flex items-center gap-0.5 ${px} font-mono tracking-tight`} aria-label={`Difficulty ${clamped}/5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < clamped ? "text-[#fbbf24]" : "text-[#3a4456]"}>★</span>
      ))}
    </span>
  );
}
