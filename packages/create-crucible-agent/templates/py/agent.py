# agent.py — Crucible Bench v2 reference agent (Python)
#
# Customize the decide() function below to implement your trading strategy.
# Everything else (signing, MCP transport, tick loop) is boilerplate — leave it as-is.
from dotenv import load_dotenv
load_dotenv("crucible.env")

import os, json, asyncio
from anthropic import Anthropic
from eth_account import Account
from eth_account.messages import encode_typed_data
from mcp.client.streamable_http import streamablehttp_client
from mcp import ClientSession

SERVER_URL = os.environ.get("CRUCIBLE_MCP_URL", "http://localhost:8080/v1")
SCENARIO = os.environ.get("SCENARIO", "choppy-range")
TOKEN_ID = os.environ.get("AGENT_TOKEN_ID", "1")
PK = os.environ["AGENT_PRIVATE_KEY"]
RUN_REGISTRY = os.environ.get("RUN_REGISTRY_V2", "0x80C1496980BA1183f8368F6072a130D7B01eDA7D")

acct = Account.from_key(PK)
anthropic = Anthropic()

DOMAIN = {"name": "CrucibleBench", "version": "2", "chainId": 16602, "verifyingContract": RUN_REGISTRY}
ACTION_TYPES = {"Action": [
    {"name": "runId", "type": "bytes32"}, {"name": "tickId", "type": "uint32"},
    {"name": "kind", "type": "string"}, {"name": "qty", "type": "uint256"},
    {"name": "reasoning", "type": "string"}, {"name": "nonce", "type": "uint256"},
]}
START_TYPES = {"StartRun": [
    {"name": "scenarioId", "type": "string"}, {"name": "tokenId", "type": "uint256"}, {"name": "nonce", "type": "uint256"},
]}

def sign(types, payload):
    msg = encode_typed_data(domain_data=DOMAIN, message_types=types, message_data=payload)
    return acct.sign_message(msg).signature.hex()

# ─── CUSTOMIZE THIS FUNCTION ─────────────────────────────────────────────────
# obs keys: tickId, price, bid, ask, position, cash, equity, news, ticksRemaining
# Return: (kind, qty_in_wei, reasoning)

def decide(obs):
    r = anthropic.messages.create(
        model="claude-haiku-4-5", max_tokens=256,
        system="""You are an active trader on a 150-tick benchmark scenario. **You MUST trade actively** — sitting at zero position the whole run wastes the benchmark.

Each tick you receive: { tickId, price, bid, ask, position, cash, equity, news, ticksRemaining }.

Rules:
- If position == 0 and you have cash, OPEN a long position with kind=market_buy, qty="500000000000000000" (= 0.5 ETH in wei) within the first 5 ticks.
- On sharp drops (price falls >2% over recent ticks), market_buy more at qty "300000000000000000" (0.3).
- On sharp rallies (price up >3%), market_sell qty "200000000000000000" (0.2) to take partial profit.
- React to news: bullish news → buy more, bearish news → sell.
- In the LAST 5 ticks (ticksRemaining < 6): market_sell your entire current position to lock in PnL.
- Otherwise noop is acceptable but rare — don't sit idle for more than 5 ticks at a time.

Reply with ONLY raw JSON, no prose, no markdown:
{"kind":"market_buy"|"market_sell"|"noop","qty":"<wei-string>","reasoning":"one short sentence"}""",
        messages=[{"role": "user", "content": json.dumps(obs)}],
    )
    txt = r.content[0].text.strip().strip("`").lstrip("json").strip()
    j = json.loads(txt)
    return j["kind"], int(j.get("qty", "0")), j.get("reasoning", "")

# ─── BOILERPLATE: signing + MCP tick loop ────────────────────────────────────

async def main():
    async with streamablehttp_client(SERVER_URL) as (read, write, _):
        async with ClientSession(read, write) as sess:
            await sess.initialize()
            nonce = 1
            sig = sign(START_TYPES, {"scenarioId": SCENARIO, "tokenId": int(TOKEN_ID), "nonce": nonce})
            start = await sess.call_tool("crucible.start_run", {
                "scenarioId": SCENARIO, "tokenId": TOKEN_ID, "nonce": str(nonce),
                "signature": sig, "signer": acct.address,
            })
            data = json.loads(start.content[0].text)
            run_id = data["runId"]; obs = data["observation"]
            print(f"Run started: {run_id} ({SCENARIO})")
            while True:
                kind, qty, reasoning = decide(obs)
                nonce += 1
                sig = sign(ACTION_TYPES, {
                    "runId": run_id, "tickId": obs["tickId"], "kind": kind, "qty": qty,
                    "reasoning": reasoning, "nonce": nonce,
                })
                r = await sess.call_tool("crucible.next_tick", {
                    "runId": run_id, "tickId": obs["tickId"], "kind": kind, "qty": str(qty),
                    "reasoning": reasoning, "nonce": str(nonce), "signature": sig, "signer": acct.address,
                })
                out = json.loads(r.content[0].text)
                if out.get("done"):
                    print("Done:", out["scorecard"]); return
                obs = out["observation"]
                print(f"tick {obs['tickId']} (remaining {obs['ticksRemaining']}) → {kind}")

asyncio.run(main())
