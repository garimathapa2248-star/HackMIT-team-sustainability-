"""RootLedger API — artifacts first, fixtures if missing, never 500 for absent files."""
from __future__ import annotations

import os
import sys
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api import conceptnote, loader, notify  # noqa: E402
from regions.catalog import city_dir, list_cities  # noqa: E402
from agent import reports  # noqa: E402
from agent.claude import answer as agent_answer  # noqa: E402
from optimize.counterfactual import apply as apply_counterfactual  # noqa: E402
from optimize.floodadapt import write as write_scenarios  # noqa: E402
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
    city: str = Field("koshi")


class AskBody(BaseModel):
    question: str = ""
    city: str = Field("koshi")


@app.middleware("http")
async def bind_city(request: Request, call_next):
    city = request.query_params.get("city") or request.headers.get("x-rootledger-city") or "koshi"
    loader.set_city(city)
    return await call_next(request)


@app.get("/cities")
def get_cities():
    return {"cities": list_cities()}


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


@app.get("/noise")
def get_noise():
    return _payload("noise")


@app.get("/hazard")
def get_hazard():
    return _payload("hazard")


@app.get("/backtest")
def get_backtest():
    return _payload("backtest")


@app.get("/attribution")
def get_attribution():
    data = loader.load("attribution")
    if data is None:
        return JSONResponse({"error": "attribution not found", "data_status": "missing"}, status_code=200)
    # Older cached artifacts contain synthetic causal percentages. Suppress them
    # at the API boundary without mutating the source artifact.
    for key in ("government_pct", "community_pct", "household_pct", "driver_shares"):
        data[key] = None
    data["quantified_responsibility_split_available"] = False
    for key in ("government_levers", "community_levers", "household_levers"):
        for row in data.get(key) or []:
            if isinstance(row, dict):
                row["risk_share_pct"] = None
    provenance = data.setdefault("provenance", {})
    provenance["api_note"] = (
        "Synthetic responsibility percentages suppressed; implementation roles are planning assumptions."
    )
    return data


@app.get("/plan")
def get_plan():
    return _payload("plan")


@app.get("/flood_observed")
def get_flood_observed():
    return _payload("flood_observed")


@app.get("/flood_modeled")
def get_flood_modeled():
    return _payload("flood_modeled")


@app.get("/flood_observed_2017")
def get_flood_observed_2017():
    return _payload("flood_observed_2017")


@app.get("/flood_modeled_2017")
def get_flood_modeled_2017():
    return _payload("flood_modeled_2017")


@app.get("/replication")
def get_replication():
    return _payload("replication")


@app.get("/rankings")
def get_rankings():
    return _payload("rankings")


@app.get("/scenarios")
def get_scenarios():
    return _payload("scenarios")


@app.get("/risk_before")
def get_risk_before():
    return _payload("risk_before")


@app.get("/risk_with_plan")
def get_risk_with_plan():
    return _payload("risk_with_plan")


@app.get("/candidates")
def get_candidates():
    return _payload("candidates")


@app.post("/optimize")
def post_optimize(body: OptimizeBody):
    city = body.city or "koshi"
    loader.set_city(city)
    mode = body.mode if body.mode in ("expected", "cvar") else "expected"
    try:
        plan = optimize(budget=body.budget, mode=mode, root=city_dir(city), draws=body.draws)
        loader.save_plan(plan, city)
        apply_counterfactual(city_dir(city), plan)
        try:
            write_scenarios(city_dir(city), plan=plan)
        except Exception:
            pass
        return plan
    except Exception as exc:  # stage must not 500
        cached = loader.load("plan", city)
        return JSONResponse(
            {"error": str(exc), "plan": cached, "data_status": "cached fallback"},
            status_code=200,
        )


@app.post("/ask")
def post_ask(body: AskBody):
    loader.set_city(body.city or "koshi")
    return agent_answer(body.question)


@app.post("/preventive-measures-plan")
@app.post("/conceptnote")  # Backward-compatible alias.
def post_preventive_measures_plan():
    return PlainTextResponse(
        conceptnote.render(),
        media_type="text/markdown",
        headers={"Content-Disposition": 'inline; filename="preventive-measures-plan.md"'},
    )


@app.get("/preventive-measures-plan")
@app.get("/conceptnote")  # Backward-compatible alias.
def get_preventive_measures_plan():
    return PlainTextResponse(
        conceptnote.render(),
        media_type="text/markdown",
        headers={"Content-Disposition": 'inline; filename="preventive-measures-plan.md"'},
    )


@app.get("/preventive-measures-plan.pdf")
@app.get("/conceptnote.pdf")  # Backward-compatible alias.
def get_preventive_measures_plan_pdf():
    return Response(
        content=conceptnote.render_pdf(),
        media_type="application/pdf",
        headers={"Content-Disposition": 'inline; filename="preventive-measures-plan.pdf"'},
    )


@app.get("/scorecard")
def get_scorecard():
    return PlainTextResponse(reports.government_scorecard(), media_type="text/markdown")


@app.get("/citizenbrief")
def get_citizen_brief():
    return PlainTextResponse(reports.citizen_brief(), media_type="text/markdown")


@app.post("/sms")
def post_sms():
    return notify.send_demo(
        "RootLedger demo: observed data, model output, assumptions, and simulations stay labeled."
    )


# Community hub: plain HTML/JS in api/static/community, served at /hub (not /community: that prefix is the API's).
app.mount("/hub", StaticFiles(directory=ROOT / "api" / "static" / "community", html=True), name="hub")


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
