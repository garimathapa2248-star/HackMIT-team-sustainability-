"""RootLedger API — artifacts first, fixtures if missing, never 500 for absent files."""
from __future__ import annotations

import os
import sys
from pathlib import Path

from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse, Response
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from api import conceptnote, loader, notify  # noqa: E402
from regions.catalog import city_dir, list_cities  # noqa: E402
from agent import reports  # noqa: E402
from agent.claude import answer as agent_answer  # noqa: E402
from optimize.counterfactual import apply as apply_counterfactual  # noqa: E402
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


class LocationAnalysisBody(BaseModel):
    """A browser map point resolved against an already-generated model pack.

    This endpoint deliberately does not claim to run the hazard model for every
    click. It returns the stored model cell containing (or nearest to) the
    coordinate, and says when that coordinate lies outside the pack coverage.
    """

    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
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


def _ring_contains(point: tuple[float, float], ring: list) -> bool:
    """Ray-casting point-in-polygon for the Polygon artifacts we publish."""
    x, y = point
    inside = False
    if len(ring) < 3:
        return False
    previous = ring[-1]
    for current in ring:
        x1, y1 = float(previous[0]), float(previous[1])
        x2, y2 = float(current[0]), float(current[1])
        crosses = (y1 > y) != (y2 > y)
        if crosses and x < (x2 - x1) * (y - y1) / ((y2 - y1) or 1e-12) + x1:
            inside = not inside
        previous = current
    return inside


def _centroid(feature: dict) -> tuple[float, float] | None:
    try:
        ring = feature["geometry"]["coordinates"][0]
        points = ring[:-1] if len(ring) > 1 and ring[0] == ring[-1] else ring
        return (
            sum(float(point[0]) for point in points) / len(points),
            sum(float(point[1]) for point in points) / len(points),
        )
    except (KeyError, IndexError, TypeError, ZeroDivisionError):
        return None


def _vulnerability_score(properties: dict) -> float:
    """Expose the UI's documented combined display score at the API boundary."""
    flood = float((properties.get("flood_depth_m") or {}).get("rp100") or 0)
    glof = float(properties.get("glof_depth_m") or 0)
    landslide = float(properties.get("landslide_prob") or 0)
    return round(min(100.0, glof / 3 * 42 + flood / 3.2 * 34 + landslide * 35), 1)


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


@app.post("/location-analysis")
def post_location_analysis(body: LocationAnalysisBody):
    """Resolve a map click to an existing precomputed hazard-model cell."""
    city = body.city or "koshi"
    loader.set_city(city)
    hazard = loader.load("hazard", city)
    if not isinstance(hazard, dict) or not isinstance(hazard.get("features"), list):
        return {
            "coverage": "unavailable",
            "city": city,
            "message": "No generated hazard pack is available for this location.",
        }

    point = (body.longitude, body.latitude)
    containing = None
    nearest = None
    nearest_distance = float("inf")
    for feature in hazard["features"]:
        geometry = feature.get("geometry") or {}
        if geometry.get("type") != "Polygon":
            continue
        rings = geometry.get("coordinates") or []
        if rings and _ring_contains(point, rings[0]):
            containing = feature
            break
        center = _centroid(feature)
        if center:
            distance = (center[0] - point[0]) ** 2 + (center[1] - point[1]) ** 2
            if distance < nearest_distance:
                nearest, nearest_distance = feature, distance

    if containing is None:
        return {
            "coverage": "unavailable",
            "city": city,
            "selected_coordinate": {"latitude": body.latitude, "longitude": body.longitude},
            "message": "This point is outside the current generated model coverage. No vulnerability result was created.",
        }

    properties = containing.get("properties") or {}
    cell_id = str(properties.get("cell_id", ""))
    candidates = loader.load("candidates", city) or []
    linked_candidates = [
        candidate for candidate in candidates
        if isinstance(candidate, dict) and cell_id in (candidate.get("cell_ids") or [])
    ]
    return {
        "coverage": "covered",
        "city": city,
        "selected_coordinate": {"latitude": body.latitude, "longitude": body.longitude},
        "feature": containing,
        "vulnerability_score": _vulnerability_score(properties),
        "score_method": "0.42 × normalized GLOF depth + 0.34 × normalized 100-year flood depth + 0.35 × landslide probability; display score capped at 100.",
        "linked_candidates": linked_candidates,
        "data_status": (hazard.get("provenance") or {}).get("data_status", "model output"),
    }


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
