# Reference Python Agent for Crucible Bench

Same flow as the TS agent, written in Python.

## Run

```bash
pip install -e .
export ANTHROPIC_API_KEY=...
export AGENT_PRIVATE_KEY=0x...
export AGENT_TOKEN_ID=42
export CRUCIBLE_MCP_URL=https://mcp.cruciblebench.xyz/v1
export SCENARIO=choppy-range
python agent.py
```
