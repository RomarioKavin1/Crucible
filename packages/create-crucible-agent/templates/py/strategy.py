"""strategy.py — your trading brain.

Edit `prompt.md` to change the system prompt without touching code.
Edit `decide()` to swap the model, add tools, change parsing, etc.
Set LLM_PROVIDER / LLM_MODEL in crucible.env to pick any provider —
no code change needed for simple model swaps.

Uses `litellm` for unified provider access (anthropic, openai, gemini, mistral,
openrouter, ollama, bedrock, …) — see https://docs.litellm.ai/docs/providers.
"""
import json
import os
from pathlib import Path
from typing import Any

import litellm

PROMPT = Path(__file__).parent.joinpath("prompt.md").read_text(encoding="utf-8")

# Provider prefix in front of the model id is litellm's routing convention.
# anthropic/claude-haiku-4-5, openai/gpt-4o-mini, gemini/gemini-2.0-flash, etc.
PROVIDER = os.environ.get("LLM_PROVIDER", "anthropic")
MODEL_ID = os.environ.get("LLM_MODEL", "claude-haiku-4-5")
ROUTED_MODEL = MODEL_ID if "/" in MODEL_ID else f"{PROVIDER}/{MODEL_ID}"

# openai-compatible / ollama / openrouter: pass base_url through.
EXTRA_KWARGS: dict[str, Any] = {}
if base := os.environ.get("LLM_BASE_URL"):
    EXTRA_KWARGS["api_base"] = base
if key := os.environ.get("LLM_API_KEY"):
    EXTRA_KWARGS["api_key"] = key

META = {
    "model": MODEL_ID,
    "framework": os.environ.get("LLM_FRAMEWORK", "litellm"),
    "agentVersion": os.environ.get("AGENT_VERSION", "0.1.0"),
}


def decide(obs: dict[str, Any]) -> tuple[str, int, str]:
    """Receive an observation; return (kind, qty_in_wei, reasoning)."""
    r = litellm.completion(
        model=ROUTED_MODEL,
        max_tokens=256,
        messages=[
            {"role": "system", "content": PROMPT},
            {"role": "user", "content": json.dumps(obs)},
        ],
        **EXTRA_KWARGS,
    )
    txt = r["choices"][0]["message"]["content"].strip()
    if txt.startswith("```"):
        txt = txt.strip("`").lstrip("json").strip()
    j = json.loads(txt)
    return j["kind"], int(j.get("qty", "0")), j.get("reasoning", "")
