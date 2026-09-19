"""RootLedger API — artifacts first, fixtures if missing, never 500 for absent files."""
from __future__ import annotations

import os
import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api import ask, conceptnote, loader  # noqa: E402
from optimize.portfolio import optimize  # noqa: E402

app = FastAPI(title="RootLedger", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OptimizeBody(BaseModel):
    budget: float = Field(2_000_000, ge=0)
    mode: str = Field("expected")
    draws: int = Field(200, ge=20, le=2000)


class AskBody(BaseModel):
    question: str = ""


def _payload(name: str):
    data = loader.load(name)
    if data is None:
        return JSONResponse({"error": f"{name} not found", "data_status": "missing"}, status_code=200)
    return data


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/signal")
def get_signal():
    return _payload("signal")


@app.get("/hazard")
def get_hazard():
    return _payload("hazard")


@app.get("/backtest")
def get_backtest():
    return _payload("backtest")


@app.get("/attribution")
def get_attribution():
    return _payload("attribution")


@app.get("/plan")
def get_plan():
    return _payload("plan")


@app.get("/candidates")
def get_candidates():
    return _payload("candidates")


@app.post("/optimize")
def post_optimize(body: OptimizeBody):
    mode = body.mode if body.mode in ("expected", "cvar") else "expected"
    try:
        plan = optimize(budget=body.budget, mode=mode, root=ROOT, draws=body.draws)
        loader.save_plan(plan)
        return plan
    except Exception as exc:  # stage must not 500
        cached = loader.load("plan")
        return JSONResponse(
            {"error": str(exc), "plan": cached, "data_status": "cached fallback"},
            status_code=200,
        )


@app.post("/ask")
def post_ask(body: AskBody):
    return ask.answer(body.question)


@app.post("/conceptnote")
def post_conceptnote():
    return PlainTextResponse(conceptnote.render(), media_type="text/markdown")


@app.get("/conceptnote")
def get_conceptnote():
    return PlainTextResponse(conceptnote.render(), media_type="text/markdown")


def main() -> None:
    import uvicorn

    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        reload=False,
    )


if __name__ == "__main__":
    main()
