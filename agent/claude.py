"""Optional OpenRouter tool-use loop. Falls back to the grounded regex agent."""
from __future__ import annotations

import inspect
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

from api import ask
from .tools import SCHEMAS, TOOLS

SYSTEM = (
    "You may only state numbers returned by tools. Never estimate, interpolate, "
    "or invent a figure. If a tool did not return it, say you do not have it. "
    "Landslide is a rainfall classifier, not a Caine threshold. "
    "people_protected is annual expected people-risk avoided, not unique people or observed lives saved. "
    "Call the flood method a local-min HAND proxy calibrated on this event; never call it Whitebox HAND "
    "or independent validation. Clearly distinguish observed data, model output, literature assumptions, "
    "and counterfactual simulation. Do not state households reached or benefiting. Do not state causal "
    "government/community/household attribution percentages. For parcel questions, use suitability, "
    "risk-driver, coordinate, and evidence fields returned by explain_parcel when available. Do not invent CSI."
)

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "openrouter/free"
FALLBACK_MODELS = ("openrouter/free", "nvidia/nemotron-3.5-lightning:free", "google/gemma-4-31b-it:free")


def _load_dotenv() -> None:
    path = Path(__file__).resolve().parents[1] / ".env"
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue
        key, _, value = stripped.partition("=")
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key and key not in os.environ:
            os.environ[key] = value


def _tools() -> list[dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": schema["name"],
                "description": schema["description"],
                "parameters": schema.get("input_schema") or {"type": "object", "properties": {}},
            },
        }
        for schema in SCHEMAS
    ]


def _call_tool(name: str, raw_args) -> object:
    fn = TOOLS.get(name)
    if not fn:
        return {"error": "unknown tool"}
    args = raw_args
    if isinstance(args, str):
        try:
            args = json.loads(args or "{}")
        except json.JSONDecodeError:
            args = {}
    if not isinstance(args, dict):
        args = {}
    allowed = {
        key: value
        for key, value in args.items()
        if key in inspect.signature(fn).parameters
    }
    return fn(**allowed)


def _message_text(message: dict) -> str:
    content = message.get("content")
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                parts.append(str(block.get("text") or block.get("content") or ""))
        return "".join(parts).strip()
    return ""


def _complete(key: str, model: str, messages: list[dict]) -> dict:
    payload = {
        "model": model,
        "messages": messages,
        "tools": _tools(),
        "tool_choice": "auto",
        "max_tokens": 800,
        "temperature": 0,
    }
    request = urllib.request.Request(
        OPENROUTER_URL,
        data=json.dumps(payload).encode(),
        method="POST",
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.environ.get("VITE_API_URL", "http://127.0.0.1:5173"),
            "X-Title": "RootLedger",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.loads(response.read().decode())
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()[:400]
        raise RuntimeError(f"OpenRouter HTTP {exc.code}: {detail}") from exc


def _models() -> list[str]:
    preferred = os.environ.get("ROOTLEDGER_MODEL", DEFAULT_MODEL).strip() or DEFAULT_MODEL
    seen: list[str] = []
    for model in (preferred, *FALLBACK_MODELS):
        if model and model not in seen:
            seen.append(model)
    return seen


def answer(question: str) -> dict:
    _load_dotenv()
    key = os.environ.get("OPENROUTER_API_KEY", "").strip()
    if not key:
        return ask.answer(question)
    messages: list[dict] = [
        {"role": "system", "content": SYSTEM},
        {"role": "user", "content": question},
    ]
    used: list[str] = []
    model = _models()[0]
    try:
        for _ in range(4):
            last_error: Exception | None = None
            data = None
            candidates = [model, *[item for item in _models() if item != model]]
            for candidate in candidates:
                try:
                    data = _complete(key, candidate, messages)
                    model = candidate
                    last_error = None
                    break
                except Exception as exc:
                    last_error = exc
                    if "429" not in str(exc) and "404" not in str(exc):
                        raise
            if data is None:
                raise last_error or RuntimeError("OpenRouter unavailable")
            choice = (data.get("choices") or [{}])[0]
            message = choice.get("message") or {}
            tool_calls = message.get("tool_calls") or []
            if not tool_calls:
                text = _message_text(message)
                if not text:
                    return ask.answer(question)
                routed = data.get("model") or model
                return {
                    "answer": text,
                    "sources": used or [f"openrouter:{routed}"],
                    "invented": False,
                }
            assistant = {
                "role": "assistant",
                "content": message.get("content") or "",
                "tool_calls": tool_calls,
            }
            messages.append(assistant)
            for call in tool_calls:
                fn = (call.get("function") or {}) if isinstance(call, dict) else {}
                name = fn.get("name") or "unknown"
                used.append(name)
                payload = _call_tool(name, fn.get("arguments"))
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": call.get("id") or name,
                        "name": name,
                        "content": json.dumps(payload)[:12000],
                    }
                )
    except Exception:
        return ask.answer(question)
    return ask.answer(question)
