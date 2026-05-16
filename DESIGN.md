# Design

> Forward-looking design system for the editorial-typographic revamp. Authoritative source for color, type, spacing, and component primitives across all public surfaces. Where this file disagrees with code, this file wins — the code should be updated.

## Visual Theme

**Editorial dark.** Tinted near-black surfaces, off-white text, one cyan accent at ≤10% coverage. Type is the primary visual element; layout is asymmetric; motion is exponential ease-out. The product feels like a Stripe / Linear changelog / Vercel page — confident, restrained, well-set.

**Dark vs. light:** dark. Scene sentence: *an agent builder reads a Sortino chart on a 27-inch monitor at 11pm with the terminal open in the next window, after just running `npx crucible-bench` for the first time*. That sentence forces dark. There is no light theme.

**Color strategy:** Restrained — tinted neutrals plus one cyan accent ≤10% of any viewport. Sortino up/down semantic pairs (green/red) only appear inside data, never as decoration.

## Color Palette (OKLCH)

All values in OKLCH for perceptual stability. Every neutral is cyan-tinted (chroma 0.008–0.012, hue ~220) — never `#000` or `#fff`.

### Surfaces

| Token | OKLCH | Hex fallback | Use |
|---|---|---|---|
| `--bg` | `oklch(0.14 0.012 220)` | `#0a0e17` | Page background |
| `--surface-1` | `oklch(0.18 0.012 220)` | `#0f1623` | Cards, panels, side rails |
| `--surface-2` | `oklch(0.22 0.013 220)` | `#161e2e` | Elevated surfaces (modals, popovers) |
| `--surface-inset` | `oklch(0.12 0.011 220)` | `#080c13` | Code blocks, inputs, terminals |

### Borders + dividers

| Token | OKLCH | Hex | Use |
|---|---|---|---|
| `--border-subtle` | `oklch(0.25 0.011 220)` | `#1c2538` | Default card border, divider |
| `--border-strong` | `oklch(0.32 0.012 220)` | `#283449` | Active / hover borders |
| `--border-accent` | `oklch(0.82 0.16 200 / 0.4)` | `rgba(34,211,238,.4)` | Selected / focus borders |

### Text

| Token | OKLCH | Hex | Use |
|---|---|---|---|
| `--text-primary` | `oklch(0.96 0.005 220)` | `#f0f2f6` | Body, headlines |
| `--text-secondary` | `oklch(0.78 0.008 220)` | `#c0c6d4` | Sub-headings, paragraph |
| `--text-muted` | `oklch(0.62 0.01 220)` | `#8a93a8` | Meta, labels, captions |
| `--text-dim` | `oklch(0.45 0.012 220)` | `#5a6378` | Disabled, low-emphasis |

### Accent + semantic

| Token | OKLCH | Hex | Use |
|---|---|---|---|
| `--accent` | `oklch(0.82 0.16 200)` | `#22d3ee` | Primary accent — links, CTAs, brand mark. ≤10% per viewport. |
| `--accent-hover` | `oklch(0.88 0.14 200)` | `#67e8f9` | Hover state for accent elements |
| `--accent-dim` | `oklch(0.82 0.16 200 / 0.12)` | `rgba(34,211,238,.12)` | Tinted backgrounds for selected rows, focus halos |
| `--up` | `oklch(0.78 0.16 155)` | `#4ade80` | Positive Sortino, positive return, "live" indicator |
| `--up-dim` | `oklch(0.78 0.16 155 / 0.12)` | `rgba(74,222,128,.12)` | Up-state backgrounds |
| `--down` | `oklch(0.68 0.18 28)` | `#f87171` | Negative Sortino, drawdown, "failed" |
| `--down-dim` | `oklch(0.68 0.18 28 / 0.12)` | `rgba(248,113,113,.12)` | Down-state backgrounds |

### Color rules

- Cyan accent never used as decoration. It marks a thing the user can act on (link, button, selected row, brand mark) or a thing the user just acted on (focus ring, completed state).
- Up/down semantic colors never decorate non-numerical surfaces. The "Live" indicator is the one allowed exception (it's a state, not a number).
- Never combine cyan + up + down in the same component. Pick one role per element.
- No gradients on text. Ever. (See absolute bans in skill.)
- Backgrounds tint warm only if intentional; default is the cyan-tinted neutral track.

## Typography

### Families

- **Sans (display + UI):** [Geist Sans](https://vercel.com/font) via `next/font/google`. Variable weight 100–900. Used everywhere except hashes and code.
- **Mono (data + code):** [Geist Mono](https://vercel.com/font) via `next/font/google`. Used for: addresses, hashes, tickIds, run IDs, contract addresses, code blocks, scenario IDs, CLI commands.
- **No serif.** No display font. No web-font bloat. Two families total.

### Scale

Base 16px. Steps roughly 1.333 ratio at small sizes, 1.5+ at editorial sizes for emphasis contrast.

| Token | Size / Line | Weight | Use |
|---|---|---|---|
| `text-mega` | 96 / 0.95 | 200 | Landing hero only |
| `text-display` | 72 / 1.0 | 300 | Page-level hero (leaderboard "0G Mainnet", etc.) |
| `text-h1` | 56 / 1.05 | 400 | Major section headings |
| `text-h2` | 40 / 1.1 | 500 | Sub-section headings |
| `text-h3` | 28 / 1.2 | 600 | Card headings, table titles |
| `text-h4` | 20 / 1.3 | 600 | Inline labels, run card titles |
| `text-lg` | 18 / 1.55 | 400 | Lead paragraph |
| `text-body` | 15 / 1.6 | 400 | Default body |
| `text-sm` | 13 / 1.5 | 400 | Meta, caption, secondary |
| `text-xs` | 11 / 1.4 | 500 | Uppercase tracked labels (`0.12em` tracking) |
| `text-mono-lg` | 16 / 1.5 | 400 (mono) | Featured hash, address in detail view |
| `text-mono` | 13 / 1.5 | 400 (mono) | Default mono — addresses, tickIds, code |
| `text-mono-sm` | 12 / 1.4 | 400 (mono) | Compact mono — table cell hashes |

Weight contrast is the primary hierarchy lever. A page should use no more than 3 weights from {200, 300, 400, 500, 600}. Editorial register expects bigger steps (e.g. 200 hero ↔ 500 body) — avoid the soft middle (400 hero ↔ 500 body looks flat).

### Type rules

- Body line length capped 60–70ch. Lead paragraphs may go to 80ch when set lg.
- Headlines (`text-h1` and up) are tracked tight: `letter-spacing: -0.02em` at 40px+, `-0.025em` at 56px+, `-0.03em` at 72px+.
- Uppercase labels (`text-xs` and section eyebrows) tracked open: `letter-spacing: 0.12em`.
- Numerical content (Sortino, return, drawdown) uses `tabular-nums` always.
- Mono never lowercased. Hex hashes always preserve case; UUIDs / IDs lowercase.

## Spacing

4px base. Use the scale, not arbitrary values.

```
--space-1: 4px
--space-2: 8px
--space-3: 12px
--space-4: 16px
--space-5: 24px
--space-6: 32px
--space-8: 48px
--space-10: 64px
--space-12: 96px
--space-16: 128px
--space-20: 160px
--space-24: 192px
```

**Vertical rhythm rule:** sections breathe. Major section gap = `--space-16` (128px) on desktop. Card internal padding = `--space-6` (32px). Tight clusters (label + value pair) = `--space-1` to `--space-2`. No floating "I'll just use 28px here" values.

## Border Radii

Editorial register rejects puffy. Smaller radii than current code.

| Token | Value | Use |
|---|---|---|
| `--radius-sm` | 4px | Inputs, small badges |
| `--radius` | 8px | Buttons, cards, dropdowns |
| `--radius-lg` | 12px | Hero panels, modal containers |
| `--radius-pill` | 9999px | Status badges only (live indicator, network chip) |

No 16px+ radii. No softer-than-soft.

## Shadows + Elevation

Restrained. Most surfaces don't need shadow — they're separated by border + background contrast.

```
--shadow-card: 0 1px 0 0 oklch(0.14 0.012 220) inset, 0 0 0 1px oklch(0.25 0.011 220);
--shadow-elevated: 0 12px 32px -8px oklch(0.05 0.01 220 / 0.6), 0 0 0 1px oklch(0.32 0.012 220);
--shadow-focus: 0 0 0 3px oklch(0.82 0.16 200 / 0.25);
```

No drop-shadows on flat icons. No glow effects. The "elevated" shadow exists for modals and the rare floating element — not for cards.

## Motion

- **Duration:** `--motion-fast: 150ms`, `--motion: 240ms`, `--motion-slow: 420ms`.
- **Easing:** `--ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1)` for hover and appear. `--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1)` for page-level transitions.
- **No bounce. No elastic. No spring.**
- Never animate `width`, `height`, `top`, `left`, `padding`, or `margin`. Animate `transform` and `opacity` only.
- Respect `prefers-reduced-motion: reduce`. Replace transforms with opacity-only fades, ≤120ms.
- Tick playback / chart redraw are not motion — they're data — and may animate at the user's playback speed without falling under the reduced-motion rule.

## Components

### Buttons

Three variants. No others.

- **Primary** — cyan accent fill, near-black text. Used for the one most-important action per view. `text-sm`, weight 500, `--radius`, 36px tall, 16px horizontal padding. No icon unless functional.
- **Ghost** — transparent background, text-primary color, `--border-subtle` outline that goes `--border-strong` on hover. Default for secondary actions.
- **Link** — inline text, cyan, underlined on hover with `text-underline-offset: 4px` and `text-decoration-thickness: 1px`. For inline navigation and reference links.

No tertiary "outline" variant. No "destructive" variant — destructive actions get a confirm dialog, not a red button.

### Cards

- `--surface-1` background, 1px `--border-subtle` border, `--radius`, no shadow.
- Internal padding `--space-6` (32px) on desktop, `--space-4` (16px) on mobile.
- Header row: `text-h4` title left, optional eyebrow above (`text-xs` uppercase, `--text-muted`).
- Never nest a card inside another card. If you feel the urge, the inner thing is a section divider with a top border, not a card.

### Tables (leaderboard, run lists)

- Borderless. Rows separated by 1px `--border-subtle` divider, no zebra striping.
- Headers `text-xs` uppercase tracked 0.12em, `--text-muted`.
- Numerical cells right-aligned, `tabular-nums`, mono for hashes and IDs.
- Row height 56px desktop, 44px compact. Vertical centering.
- Hover: row background goes to `--accent-dim`. No scale, no shift.

### Badges

- `text-xs`, uppercase, tracked 0.10em, weight 500.
- `--radius-pill`, 4px vertical padding, 10px horizontal.
- Color paired: text color + matching `-dim` background. e.g. `text-[--up] bg-[--up-dim]`.
- Used for: run state (signed / legacy), live indicator, network chip.

### Forms

- Borderless inputs on the marketing surface (under-line style). Bordered (1px subtle) on the product surface.
- Focus state: `--accent` border + 3px `--shadow-focus` halo.
- Label above input, `text-xs` uppercase tracked, `--text-muted`.

## Layout

### Grid

12-column grid, 24px gutters, max-width 1240px container. Edge padding 32px desktop / 20px mobile.

**Asymmetry is the rule.** Default to 7+5 or 8+4 splits, not 6+6 or 4+4+4. A landing hero should anchor to the left half with metadata floating in the right half — not center-stacked.

### Containers

- `--container-wide: 1240px` — landing, leaderboard, scenarios index.
- `--container: 1080px` — run detail, scenario detail, runbuilder.
- `--container-narrow: 760px` — long-form content (verify result narrative, edge-case prose).

Never wrap everything in a container. The leaderboard table edge-to-edge is fine. The hero metadata can break the container.

### Surfaces hierarchy

Three layers max:
1. **Page background** (`--bg`) — the canvas.
2. **Section surface** (transparent, with optional top border) — the structural divider.
3. **Card surface** (`--surface-1`) — one elevation, used sparingly.

Anything beyond three layers is over-engineered.

## Icons

- Use 1.5px strokes. No filled. No two-tone.
- 16px default size, 20px for hero actions, 12px for inline mono labels.
- Source: [Lucide](https://lucide.dev) for everything except the brand mark.
- Brand mark: the cyan diamond `◆` rendered as Unicode at the H1 size — not an SVG. Letting the type system carry the brand is on-message.

## Anti-patterns (do not produce)

- **Big-number hero block.** Big sortino + small "average across all runs" + 4 supporting micro-stats. This is the SaaS hero-metric template the brand reference page explicitly rejects.
- **Card-grid features.** Identical 3-column cards with icon-on-top, title-middle, paragraph-bottom. Find a different structural pattern (asymmetric, list with hairlines, etc.).
- **Decorative gradients.** Hero background gradients, button gradients, text gradients. Banned at the skill level.
- **Glass effects.** No `backdrop-filter: blur` as decoration. The one allowed use is the sticky header background, opacity ~0.85.
- **Centered everything.** Landing hero centered, subhead centered, two buttons centered, three feature cards centered. Asymmetric or it's not editorial.
- **Tag-stack icon-row.** Below the hero, a centered row of grayscale logos "trusted by ..." — we don't have trust signals to fake.
