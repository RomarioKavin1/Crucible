/**
 * Inline 0G mark — small monochrome glyph for "Built on 0G" chips,
 * footer credit, and the chain pill in the header.
 *
 * Geometric "0G" — a circle with a notch, evoking the 0 + G letterforms
 * in a single shape. Currentcolor so it can sit on any surface.
 */
export function OgMark({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="0G"
    >
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path
        d="M8 8 L13 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="8" r="1.25" fill="currentColor" />
    </svg>
  );
}
