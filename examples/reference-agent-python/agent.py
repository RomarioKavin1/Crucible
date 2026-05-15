# examples/reference-agent-python/agent.py
#
# Reference Python agent for Crucible Bench v2.
# Connects via MCP, signs every action with the wallet's private key, runs to done.
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

# Self-described agent metadata — recorded on chain in RunRegistryV3.
# Anything you set here surfaces on the leaderboard as the Model column.
META = {
    "model": os.environ.get("AGENT_MODEL", "claude-haiku-4-5"),
    "framework": "anthropic-sdk",
    "agentVersion": "0.1.0",
}

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

def decide(obs):
    r = anthropic.messages.create(
        model="claude-haiku-4-5", max_tokens=256,
        system='Trader. Reply with JSON: {"kind":"market_buy|market_sell|noop","qty":"<wei>","reasoning":"…"}',
        messages=[{"role": "user", "content": json.dumps(obs)}],
    )
    txt = r.content[0].text.strip().strip("`").lstrip("json").strip()
    j = json.loads(txt)
    return j["kind"], int(j.get("qty", "0")), j.get("reasoning", "")

async def main():
    async with streamablehttp_client(SERVER_URL) as (read, write, _):
        async with ClientSession(read, write) as sess:
            await sess.initialize()
            nonce = 1
            sig = sign(START_TYPES, {"scenarioId": SCENARIO, "tokenId": int(TOKEN_ID), "nonce": nonce})
            start = await sess.call_tool("crucible.start_run", {
                "scenarioId": SCENARIO, "tokenId": TOKEN_ID, "nonce": str(nonce),
                "signature": sig, "signer": acct.address,
                "model": META["model"], "framework": META["framework"], "agentVersion": META["agentVersion"],
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
