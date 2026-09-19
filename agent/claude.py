"""Optional Anthropic tool-use loop. Falls back to the grounded regex agent."""
from __future__ import annotations

import json
import os

from api import ask
from .tools import SCHEMAS, TOOLS

SYSTEM = (
    "You may only state numbers returned by tools. Never estimate, interpolate, "
    "or invent a figure. If a tool did not return it, say you do not have it. "
    "Landslide is a rainfall classifier, not a Caine threshold. "
    "people_protected is annual expected people-risk avoided, not unique lives. "
    "Do not invent CSI."
)


def answer(question: str) -> dict:
    key = os.environ.get("ANTHROPIC_API_KEY", "").strip()
    if not key:
        return ask.answer(question)
    try:
        import anthropic
    except ImportError:
        return ask.answer(question)
    client = anthropic.Anthropic(api_key=key)
    model = os.environ.get("ROOTLEDGER_MODEL", "claude-sonnet-4-5")
    messages = [{"role": "user", "content": question}]
    used = []
    for _ in range(4):
        resp = client.messages.create(
            model=model,
            max_tokens=800,
            system=SYSTEM,
            tools=[{"name": s["name"], "description": s["description"], "input_schema": s["input_schema"]} for s in SCHEMAS],
            messages=messages,
        )
        if resp.stop_reason != "tool_use":
            text = "".join(b.text for b in resp.content if getattr(b, "type", "") == "text")
            return {"answer": text.strip(), "sources": used or ["claude+tools"], "invented": False}
        tool_results = []
        for block in resp.content:
            if getattr(block, "type", "") != "tool_use":
                continue
            fn = TOOLS.get(block.name)
            used.append(block.name)
            payload = fn(**(block.input or {})) if fn else {"error": "unknown tool"}
            tool_results.append({
                "type": "tool_result",
                "tool_use_id": block.id,
                "content": json.dumps(payload)[:12000],
            })
        messages.append({"role": "assistant", "content": resp.content})
        messages.append({"role": "user", "content": tool_results})
    return ask.answer(question)
