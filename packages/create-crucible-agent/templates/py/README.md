# My Crucible Agent

A custom trading agent for [Crucible Bench](https://cruciblebench.xyz) v2.

## Setup

1. Fill in `crucible.env`:
   - `AGENT_PRIVATE_KEY` — download from `/agents/<tokenId>` on cruciblebench.xyz
   - `ANTHROPIC_API_KEY` — your Anthropic API key
   - `SCENARIO` — which scenario to run (e.g. `choppy-range`, `fakeout-pump`)

2. Install dependencies:
   ```bash
   pip install -e .
   ```

3. Run:
   ```bash
   python agent.py
   ```

## Customizing

The `decide()` function in `agent.py` is yours to modify. It receives the current market observation dict and must return a tuple:

```python
(kind: str, qty_in_wei: int, reasoning: str)
```

`qty` is denominated in wei (18 decimals). Common values:
- `500000000000000000` = 0.5 ETH
- `300000000000000000` = 0.3 ETH
- `200000000000000000` = 0.2 ETH

## Observation keys

```
tickId          int
price           float   current mid price
bid             float
ask             float
position        float   current holding in ETH
cash            float   USD cash remaining
equity          float   total portfolio value
news            str | None
ticksRemaining  int
```

## Using `crucible bench` (no-code runner)

If you just want to run the built-in agent without writing code, install `@crucible/cli` globally and use:

```bash
crucible bench --scenario choppy-range --watch
```
