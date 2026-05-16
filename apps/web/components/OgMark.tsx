import Image from "next/image";

/**
 * Real 0G wordmark. Drop-in mark for "Built on 0G" chips, footer credit,
 * the chain pill, etc. The PNG is purple (the brand), so any text-color
 * class passed in is a no-op — `className` is forwarded for layout only.
 *
 * `size` is the rendered HEIGHT in px; width is derived from the source's
 * 756×366 aspect ratio so the glyph never squashes.
 */
const AR = 756 / 366;

export function OgMark({
  size = 14,
  className = "",
  alt = "0G",
}: {
  size?: number;
  className?: string;
  alt?: string;
}) {
  const w = Math.round(size * AR);
  return (
    <Image
      src="/0g_logo.png"
      width={w}
      height={size}
      alt={alt}
      className={className}
      priority={false}
    />
  );
}
