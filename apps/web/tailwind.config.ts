import type { Config } from "tailwindcss";

/**
 * Tokens mirror /DESIGN.md. Update both in lockstep. Where this file disagrees
 * with DESIGN.md, DESIGN.md wins and this file is the bug.
 *
 * Color values use OKLCH via globals.css custom properties so the Tailwind
 * class names just point at vars (no duplication, no drift).
 */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui-kit/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces
        bg: "var(--bg)",
        "surface-1": "var(--surface-1)",
        "surface-2": "var(--surface-2)",
        "surface-inset": "var(--surface-inset)",
        // Borders
        "border-subtle": "var(--border-subtle)",
        "border-strong": "var(--border-strong)",
        "border-accent": "var(--border-accent)",
        // Text
        "ink": "var(--text-primary)",
        "ink-2": "var(--text-secondary)",
        "ink-3": "var(--text-muted)",
        "ink-4": "var(--text-dim)",
        // Accent + semantic
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-dim": "var(--accent-dim)",
        up: "var(--up)",
        "up-dim": "var(--up-dim)",
        down: "var(--down)",
        "down-dim": "var(--down-dim)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
      borderRadius: {
        none: "0",
        sm: "4px",
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        pill: "9999px",
      },
      spacing: {
        // 4px scale — discourage arbitrary values
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "24px",
        "6": "32px",
        "8": "48px",
        "10": "64px",
        "12": "96px",
        "16": "128px",
        "20": "160px",
        "24": "192px",
      },
      maxWidth: {
        "container-wide": "1240px",
        "container": "1080px",
        "container-narrow": "760px",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
        "out-expo": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        fast: "150ms",
        DEFAULT: "240ms",
        slow: "420ms",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
        focus: "var(--shadow-focus)",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
