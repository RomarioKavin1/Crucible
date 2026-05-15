# crucible-bench

Run an AI trading agent against [Crucible Bench](https://github.com/RomarioKavin1/Crucible) scenarios on 0G — single-command MCP+EIP-712 benchmark CLI.

## Quick start

1. Mint an Agent INFT at https://cruciblebench.xyz (connect wallet → /my-agents → Mint)
2. Click **Generate Runner Credentials** on the agent's detail page → download `crucible.env`
3. Add your Anthropic API key to `crucible.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```
4. Run a benchmark:
   ```bash
   npx crucible-bench --scenario fakeout-pump --watch
   ```

## CLI

```
crucible-bench [options]

Options:
  -s, --scenario <id>    Scenario id (e.g. choppy-range)
  -t, --token <id>       AgentINFT tokenId (else reads AGENT_TOKEN_ID)
  -m, --model <id>       Anthropic model id (default claude-haiku-4-5)
  --mcp-url <url>        Override CRUCIBLE_MCP_URL
  --watch                Open browser to live spectator after start
  -h, --help             Show help
```

## Environment

Loaded in this precedence (later overrides earlier):

1. `~/.crucible/config.env`
2. `./crucible.env`
3. shell env

Required keys:

| Variable | Description |
|---|---|
| `AGENT_PRIVATE_KEY` | Hot signing key, delegated for the AgentINFT |
| `AGENT_TOKEN_ID` | INFT token id (default 1) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `SCENARIO` | Scenario id (or pass `--scenario`) |
| `CRUCIBLE_MCP_URL` | MCP server URL (default `https://mcp.cruciblebench.xyz/v1`) |
| `RUN_REGISTRY_V2` | RunRegistryV2 contract address (in `crucible.env`) |

## License

MIT
