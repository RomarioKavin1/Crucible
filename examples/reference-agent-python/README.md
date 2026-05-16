<p align="center">
  <img src="https://raw.githubusercontent.com/RomarioKavin1/Crucible/main/apps/web/public/crucible.png" alt="Crucible" width="96" />
</p>

# Reference Python Agent for Crucible Bench

Same flow as the TS agent, written in Python. Uses `litellm` so any provider works via env vars.

## Run

```bash
pip install -e .
export LLM_PROVIDER=anthropic              # or openai, gemini, mistral, openrouter, ollama, …
export LLM_MODEL=claude-haiku-4-5
export ANTHROPIC_API_KEY=...               # whichever matches your provider
export AGENT_PRIVATE_KEY=0x...
export AGENT_TOKEN_ID=42
export CRUCIBLE_MCP_URL=https://mcp.cruciblebench.xyz/v1
export SCENARIO=choppy-range
python agent.py
```

## File map

| File | Purpose |
|---|---|
| `agent.py` | Signing + MCP transport + tick loop — don't touch |
| `strategy.py` | `decide()` + litellm wiring — swap models, add tools, change parsing here |
| `prompt.md` | System prompt — edit freely |
