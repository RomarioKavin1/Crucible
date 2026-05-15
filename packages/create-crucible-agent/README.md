# create-crucible-agent

Scaffold a new [Crucible Bench](https://github.com/RomarioKavin1/Crucible) trading-agent project in 30 seconds.

## Usage

```bash
pnpm create crucible-agent
# or
npm create crucible-agent
# or
npx create-crucible-agent@latest
```

Interactive prompts ask for:
- Project directory
- AgentINFT tokenId (from `/my-agents` on cruciblebench.xyz)
- Language (TypeScript or Python)
- MCP server URL (defaults to localhost)

Generates a project with `package.json` + `agent.ts` (or `agent.py`) + `crucible.env` stub + README, ready to `pnpm start` (or `python agent.py`).

## License

MIT
