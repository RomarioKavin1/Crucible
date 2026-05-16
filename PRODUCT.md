# Product

## Register

brand

## Users

**Primary: AI agent builders.** Engineers writing autonomous trading agents in Claude / GPT / Gemini / Llama / local models, usually as a weekend or side project, sometimes professionally. They live in a terminal, read code more readily than marketing pages, and have been burned by self-reported benchmarks. They land on `cruciblebench.xyz` from a tweet, a HackerNews post, a Discord link, or an `npx crucible-bench` README, and within 60 seconds decide whether this is real or another hackathon toy.

**Secondary: 0G hackathon judges and ecosystem reviewers.** Scanning 100 submissions. Need to verify the on-chain claims are real, the contracts are deployed, the trace verification actually works. Click into a leaderboard row, expect to see signed actions and a verify-against-chain button.

**Tertiary: agent-leaderboard observers.** People considering using a competitor's agent who want to confirm "is that Sortino number actually real, or marketing?" They land on a specific `/runs/[id]` from a shared link and need to see the cryptographic proof immediately.

**Context:** desktop browser, dark room, terminal open in the next window, skeptical mood. The page has roughly 5 seconds to communicate "this is infrastructure, not a demo."

## Product Purpose

Crucible Bench is the verifiable, on-chain benchmark for autonomous AI trading agents on 0G. Every per-tick decision is EIP-712 signed by an `AgentINFT`-authorized wallet, every trace is uploaded to 0G Storage, every score is recorded in `RunRegistryV3`. Anyone can re-derive the signer, re-replay the trace, and re-compute the score. The score is the chain.

Success looks like:
- An agent builder runs `npx crucible-bench` within 5 minutes of landing on the site.
- A judge can click into any leaderboard row and watch the verify page turn all-green without leaving the browser.
- An observer can prove (not trust) a posted Sortino score.

## Brand Personality

**Three words:** rigorous, plain-spoken, opinionated.

**Voice:** technical confidence without jargon-as-status. The system speaks like an engineer explaining infrastructure to another engineer, not like a SaaS marketing page explaining a product to a buyer. Says "every action signed, every score on 0G, no self-reporting" instead of "trustless, decentralized, AI-powered."

**Emotional goal:** the visitor should feel they've found something that takes itself seriously. Not loud. Not friendly. Not playful. Quietly assertive — the way a well-written RFC or a clean systems paper feels.

## Anti-references

Explicit no-fly zones:

- **Fintech-corporate.** No navy + gold. No ticker tape decoration. No stock photography of a trader at a Bloomberg terminal. No "Wall Street meets Web3" cosplay. The product is infrastructure for AI builders, not a hedge-fund pitch deck.
- **Dashboard-as-marketing.** No sidebar nav on the landing page. No kanban screenshot. No generic data-viz hero. The marketing surface is not an admin tool screenshot — it's a publication about an admin tool.
- **Web3 default.** No neon-on-black. No glow effects. No glass cards as decoration. No NFT-cyberpunk gradients. The fact that it's on 0G is communicated through actual on-chain proof, not through aesthetic genre.
- **SaaS-cream landing.** No hero-metric template (big number / small label / supporting stats / gradient accent). No identical card grids of "Feature 1 / Feature 2 / Feature 3." No isometric illustrations of cubes floating in space.

## Design Principles

1. **Practice what you preach.** The site that argues "self-reported metrics are gameable" cannot use fake-looking screenshots or seed data. Every number on every surface is a live on-chain value or labeled clearly as an example. The recent-runs rail, the leaderboard previews, the contract addresses — all real, all clickable.

2. **Type is the brand.** Editorial-typographic register. Big confident sans-serif for headlines (≥56px on desktop, asymmetric weight contrast), monospace for anything that's a hash / address / metric / on-chain identifier. No gradients. No glows. Hierarchy through scale and weight contrast, not color.

3. **Show, then explain.** Every claim is anchored to a clickable artifact within one viewport: the verify-button next to the Sortino, the explorer-link next to the contract, the npx command beside the agent. The visitor never reads three paragraphs before seeing proof.

4. **Asymmetric, not template.** Break the equal-thirds-grid muscle memory. Long-form sections lean against thin sidebars. The leaderboard isn't a generic ag-grid — it's a typographic list, mass-of-rows as visual texture. The hero is not centered; it's anchored to one side with running metadata in the negative space.

5. **Restraint as confidence.** Color budget is small: tinted near-black surfaces, off-white text, one cyan accent at <10% coverage. Motion is exponential ease-out, never bounce, never elastic. The page does not try to delight — it tries to be correct.

## Accessibility & Inclusion

- WCAG 2.1 AA across all public surfaces. Contrast ratio ≥4.5:1 for body, ≥3:1 for large text and UI components.
- Reduced-motion support: respect `prefers-reduced-motion: reduce` — disable parallax, page-load slides, and any auto-cycling animation. Equity charts and tick replays must remain readable as static states.
- Keyboard navigation across every interactive element. Visible focus rings (not removed, not subtle — they're a feature).
- Address/hash truncation always uses both ends (`0x2414…5532`), never just the start.
- Color-blind safety: the cyan accent is never the only signal — pair with text, weight, or icon. Sortino "up" vs "down" uses both color and a glyph.
- Monospace runs at a comfortable size (≥14px on desktop) — addresses are content, not decoration.
