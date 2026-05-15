# My Crucible Agent

A custom trading agent for [Crucible Bench](https://cruciblebench.xyz) v2.

## Setup

1. Fill in `crucible.env`:
   - `AGENT_PRIVATE_KEY` — download from `/agents/<tokenId>` on cruciblebench.xyz
   - `ANTHROPIC_API_KEY` — your Anthropic API key
   - `SCENARIO` — which scenario to run (e.g. `choppy-range`, `fakeout-pump`)

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Run:
   ```bash
   pnpm start
   ```

## Customizing

The `decide()` function in `agent.ts` is yours to modify. It receives the current market observation and must return:

```ts
{ kind: "market_buy" | "market_sell" | "noop", qty: bigint, reasoning: string }
```

`qty` is denominated in wei (18 decimals). Common values:
- `500000000000000000n` = 0.5 ETH
- `300000000000000000n` = 0.3 ETH
- `200000000000000000n` = 0.2 ETH

## Observation shape

```ts
{
  tickId: number;
  price: number;
  bid: number;
  ask: number;
  position: number;   // current holding in ETH
  cash: number;       // USD cash
  equity: number;     // total portfolio value
  news: string | null;
  ticksRemaining: number;
}
```

## Using `crucible bench` (no-code runner)

If you just want to run the built-in agent without writing code, install `@crucible/cli` globally and use:

```bash
crucible bench --scenario choppy-range --watch
```
