"""Portfolio optimisation over nature-based intervention candidates.

The optimizer takes Subodh's hazard cells and candidate parcels plus Jeevith's
EVT signal, then chooses the set of parcels that maximises a **triple return**
(annual expected people-risk avoided + CO2 sequestered + household income) per
dollar, subject to a budget.

Two design choices make it defensible rather than a black box:

1. **No double-counting.**  A marginal greedy tracks how much expected loss is
   still capturable in each hazard cell.  Two parcels covering the same cell
   cannot both claim the full reduction.

2. **The uncertainty is the point (the Voloridge angle).**  Avoided loss is
   evaluated across Monte-Carlo hazard scenarios whose spread is calibrated to
   the fitted GEV tail (the 100-year return-level confidence interval) plus
   per-cell spatial noise.  ``mode="cvar"`` optimises the worst-10% tail instead
   of the mean, which measurably rewards spatially diversified portfolios.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable, Sequence

from . import economics

# --- Triple-return monetisation (screening-grade, documented, swappable) ------
# One unit of "annual expected people-risk avoided" is monetised so lives,
# carbon, and income share a comparable scale in the selection objective.  Lives
# dominate by design; carbon and income act as co-benefit tie-breakers.
VALUE_PER_PERSON_YR = 5000.0   # USD per unit annual expected people-risk avoided
PRICE_CO2_PER_T = 50.0         # USD per tonne CO2 (10-yr stock, undiscounted)
INCOME_VALUE_YEARS = 10        # value this many years of the income stream

DEFAULT_DRAWS = 500
DEFAULT_SEED = 20260919
CELL_NOISE_SIGMA = 0.35        # per-cell spatial hazard heterogeneity (lognormal)
CVAR_ALPHA = 0.10              # worst 10% tail


def _numpy():
    try:
        import numpy as np
        return np
    except ImportError as exc:  # pragma: no cover - environment-dependent
        raise RuntimeError("Install optimize/requirements.txt (numpy) to run the optimizer.") from exc


# --- Loading ------------------------------------------------------------------

def _first_existing(*paths: Path) -> Path | None:
    for path in paths:
        if path and path.exists():
            return path
    return None


def load_inputs(root: Path | str = ".") -> tuple[list[dict], dict[str, dict], dict]:
    """Load candidates, a cell-keyed hazard map, and the signal.

    Prefers generated ``artifacts/`` files and falls back to
    ``contracts/fixtures/`` so the optimizer runs before real data lands.
    """
    paths = resolve_input_paths(root)
    cand_path, haz_path, sig_path = paths["candidates"], paths["hazard"], paths["signal"]
    if not cand_path or not haz_path:
        raise FileNotFoundError("Need candidates.json and hazard.geojson in artifacts/ or contracts/fixtures/.")

    candidates = json.loads(cand_path.read_text())
    hazard = _index_hazard(json.loads(haz_path.read_text()))
    signal = json.loads(sig_path.read_text()) if sig_path else {}
    economics.validate_candidates(candidates)
    return candidates, hazard, signal


def resolve_input_paths(root: Path | str = ".") -> dict[str, Path | None]:
    """Locate candidate / hazard / signal files (artifacts first, then fixtures)."""
    root = Path(root)
    art, fix = root / "artifacts", root / "contracts" / "fixtures"
    return {
        "candidates": _first_existing(art / "candidates.json", fix / "candidates.json"),
        "hazard": _first_existing(art / "hazard.geojson", fix / "hazard.geojson"),
        "signal": _first_existing(art / "signal.json", fix / "signal.json"),
    }


def _index_hazard(geojson: dict) -> dict[str, dict]:
    cells: dict[str, dict] = {}
    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        cell_id = props.get("cell_id")
        if cell_id is None:
            continue
        cells[str(cell_id)] = {
            "eal_people": float(props.get("eal_people", 0.0) or 0.0),
            "population": float(props.get("population", 0.0) or 0.0),
        }
    return cells


# --- Scenario model -----------------------------------------------------------

def climate_sigma_from_signal(signal: dict) -> float:
    """Lognormal sigma for the common climate multiplier, from the GEV 100-yr CI.

    Relative CI half-width of the 100-year return level is a direct, honest read
    on how uncertain the fitted tail is; we map it to a multiplicative EAL sigma.
    Falls back to a modest default when the signal lacks a usable interval.
    """
    try:
        lo, hi = signal["return_levels_ci95"]["100"]
        central = signal["return_levels_mm"]["100"]
        if central and hi > lo > 0:
            rel_half_width = (float(hi) - float(lo)) / (2 * 1.96 * float(central))
            return max(0.05, min(0.6, rel_half_width))
    except (KeyError, TypeError, ValueError, ZeroDivisionError):
        pass
    return 0.25


def build_scenarios(cell_ids: Sequence[str], hazard: dict[str, dict], signal: dict,
                    draws: int = DEFAULT_DRAWS, seed: int = DEFAULT_SEED):
    """Return an (n_cells, draws) matrix of scenario expected people-loss per cell.

    Each cell's loss = base EAL x common climate multiplier x independent cell
    noise.  The shared climate factor couples cells (a bad year is bad
    everywhere); the per-cell factor is what makes concentrated portfolios
    tail-riskier than diversified ones.
    """
    np = _numpy()
    rng = np.random.default_rng(seed)
    sigma = climate_sigma_from_signal(signal)
    climate = rng.lognormal(mean=-0.5 * sigma ** 2, sigma=sigma, size=draws)
    base = np.array([hazard.get(cid, {}).get("eal_people", 0.0) for cid in cell_ids], dtype=float)
    cell_noise = rng.lognormal(mean=-0.5 * CELL_NOISE_SIGMA ** 2, sigma=CELL_NOISE_SIGMA,
                               size=(len(cell_ids), draws))
    return base[:, None] * climate[None, :] * cell_noise, sigma


# --- Core greedy optimiser ----------------------------------------------------

def _tail_mean(np, vector, alpha: float = CVAR_ALPHA) -> float:
    """Mean of the worst (smallest) ``alpha`` fraction of a scenario vector."""
    if vector.size == 0:
        return 0.0
    k = max(1, int(round(alpha * vector.size)))
    return float(np.sort(vector)[:k].mean())


def prepare(candidates: list[dict], cell_index: dict[str, int]) -> list[dict]:
    """Precompute each parcel's static economics once so greedy can be re-run cheaply.

    Cost, carbon, income, effect fraction, and covered-cell rows never change
    across budget levels, so the efficient frontier's repeated greedy passes all
    share this table.
    """
    prepared = []
    for i, parcel in enumerate(candidates):
        rows = [cell_index[c] for c in parcel.get("cell_ids", []) if c in cell_index]
        prepared.append({
            "idx": i,
            "parcel_id": parcel["parcel_id"],
            "cost": economics.parcel_cost(parcel),
            "effect": economics.eal_reduction_frac(parcel),
            "co2": economics.parcel_co2_10yr(parcel),
            "income": economics.parcel_income_yr(parcel),
            "rows": rows,
        })
    return prepared


def _greedy(prepared: list[dict], n_cells: int, cell_expected, scenario_cell,
            budget: float, mode: str, np) -> dict:
    """Marginal greedy with per-cell capping.

    At every step each affordable parcel is scored by its *marginal* triple
    return per dollar given how much loss is still capturable in its cells; the
    best is taken.  ``mode="cvar"`` scores the marginal contribution's worst-10%
    tail; ``mode="expected"`` uses the (mean-1) per-cell expectation directly and
    never touches the scenario matrix, which keeps the budget slider snappy.
    """
    draws = scenario_cell.shape[1]
    remaining_frac = np.ones(n_cells)                    # capturable share per cell
    portfolio = np.zeros(draws)                          # avoided people per scenario
    selected: list[dict] = []
    spent = 0.0
    pool = list(prepared)

    while pool:
        best, best_score, best_pack = None, 0.0, None
        for p in pool:
            cost = p["cost"]
            if cost <= 0 or not p["rows"] or spent + cost > budget + 1e-6:
                continue
            effect = p["effect"]
            captured_by_cell = [(r, min(effect, remaining_frac[r])) for r in p["rows"]]
            captured_by_cell = [(r, cap) for r, cap in captured_by_cell if cap > 0]
            if not captured_by_cell:
                continue
            expected_marginal = sum(cell_expected[r] * cap for r, cap in captured_by_cell)
            if mode == "cvar":
                marginal_vec = np.zeros(draws)
                for r, cap in captured_by_cell:
                    marginal_vec += scenario_cell[r] * cap
                protection = _tail_mean(np, marginal_vec)
            else:
                marginal_vec = None
                protection = expected_marginal
            value = (protection * VALUE_PER_PERSON_YR
                     + p["co2"] * PRICE_CO2_PER_T
                     + p["income"] * INCOME_VALUE_YEARS)
            score = value / cost
            if score > best_score:
                best_score = score
                best = p
                best_pack = (cost, expected_marginal, marginal_vec, captured_by_cell)
        if best is None:
            break
        cost, expected_marginal, marginal_vec, captured_by_cell = best_pack
        for r, cap in captured_by_cell:
            remaining_frac[r] -= cap
        if marginal_vec is None:
            marginal_vec = np.zeros(draws)
            for r, cap in captured_by_cell:
                marginal_vec += scenario_cell[r] * cap
        portfolio += marginal_vec
        spent += cost
        selected.append({
            "parcel_id": best["parcel_id"],
            "cost_usd": round(cost, 2),
            "avoided_eal_people": round(float(expected_marginal), 4),
            "co2_t_10yr": round(best["co2"], 2),
            "income_usd_yr": round(best["income"], 2),
        })
        pool.remove(best)

    return {
        "selected": selected,
        "spent": spent,
        "portfolio": portfolio,
        "remaining_frac": remaining_frac,
    }


# --- Public API ---------------------------------------------------------------

def optimize(budget: float = 2_000_000.0, mode: str = "expected",
             root: Path | str = ".", draws: int = DEFAULT_DRAWS,
             seed: int = DEFAULT_SEED,
             frontier_points: int = 6) -> dict:
    """Plan the optimal intervention portfolio for a budget.

    This is the single entry point the API imports.  Returns a ``plan.json``-shaped
    dict; it never raises for an empty/over-tight budget, it returns an empty plan.
    ``mode`` is ``"expected"`` (maximise mean protection) or ``"cvar"`` (maximise
    the worst-10% tail).
    """
    np = _numpy()
    if mode not in ("expected", "cvar"):
        raise ValueError("mode must be 'expected' or 'cvar'.")
    candidates, hazard, signal = load_inputs(root)

    cell_ids = sorted({c for parcel in candidates for c in parcel.get("cell_ids", []) if c in hazard})
    cell_index = {cid: i for i, cid in enumerate(cell_ids)}
    scenario_cell, sigma = build_scenarios(cell_ids, hazard, signal, draws=draws, seed=seed)
    cell_expected = scenario_cell.mean(axis=1) if scenario_cell.size else np.zeros(0)
    baseline_expected = float(cell_expected.sum()) if cell_expected.size else 0.0
    prepared = prepare(candidates, cell_index)
    n_cells = len(cell_index)

    result = _greedy(prepared, n_cells, cell_expected, scenario_cell, float(budget), mode, np)
    portfolio = result["portfolio"]
    selected = result["selected"]

    people_protected = float(portfolio.mean()) if portfolio.size else 0.0
    tail_people = _tail_mean(np, portfolio) if portfolio.size else 0.0

    # Households benefiting: protected population share across covered cells.
    protected_pop = 0.0
    for cid, i in cell_index.items():
        captured = 1.0 - float(result["remaining_frac"][i])
        protected_pop += hazard[cid]["population"] * captured
    households = int(round(protected_pop / economics.PEOPLE_PER_HOUSEHOLD)) if protected_pop else 0

    totals = {
        "cost_usd": round(result["spent"], 2),
        "people_protected": round(people_protected, 3),
        "exposure_reduction_pct": round(100 * people_protected / baseline_expected, 2) if baseline_expected else 0.0,
        "co2_t_10yr": round(sum(s["co2_t_10yr"] for s in selected), 2),
        "income_usd_yr": round(sum(s["income_usd_yr"] for s in selected), 2),
        "households_benefiting": households,
    }

    frontier = _build_frontier(prepared, n_cells, cell_expected, scenario_cell, float(budget),
                               mode, np, frontier_points)

    return {
        "budget_usd": float(budget),
        "mode": mode,
        "selected": selected,
        "totals": totals,
        "frontier": frontier,
        "cvar": {
            "mode_available": True,
            "tail_people_protected": round(tail_people, 3),
            "alpha": CVAR_ALPHA,
        },
        "provenance": {
            "data_status": "model output — screening-grade optimisation, not an investment recommendation",
            "method": (
                f"marginal greedy triple-return/$ with per-cell EAL capping over {draws} "
                f"Monte-Carlo hazard scenarios; climate multiplier sigma={round(sigma, 3)} "
                f"from GEV 100-yr CI; objective={'worst-10% tail' if mode == 'cvar' else 'expected'}"
            ),
            "factors": economics.factor_table(),
            "monetisation": {
                "value_per_person_yr_usd": VALUE_PER_PERSON_YR,
                "price_co2_per_t_usd": PRICE_CO2_PER_T,
                "income_value_years": INCOME_VALUE_YEARS,
            },
            **_candidates_note(root, candidates, totals, float(budget)),
        },
    }


def _rel(root: Path | str, path: Path | None) -> str | None:
    if path is None:
        return None
    root = Path(root)
    try:
        return str(path.resolve().relative_to(root.resolve()))
    except ValueError:
        return str(path)


def _candidates_note(root, candidates, totals, budget) -> dict:
    paths = resolve_input_paths(root)
    source = _rel(root, paths["candidates"]) or "unknown"
    n = len(candidates)
    spent = float(totals["cost_usd"])
    fixture = "fixtures" in source.replace("\\", "/")
    thin = n <= 2 or spent < 0.05 * budget
    note = None
    if fixture or thin:
        note = (
            f"Universe is {n} parcel(s) from {source}. "
            f"Spend ${spent:,.0f} of ${budget:,.0f} is the solver exhausting that universe, "
            "not a $2M allocation. Re-run when Subodh ships real artifacts/candidates.json."
        )
    return {
        "candidates_source": source,
        "hazard_source": _rel(root, paths["hazard"]),
        "signal_source": _rel(root, paths["signal"]),
        "candidates_note": note,
    }


def _build_frontier(prepared, n_cells, cell_expected, scenario_cell, budget, mode, np, points):
    """Efficient frontier: re-solve at a grid of budgets up to the requested one."""
    if points < 2 or budget <= 0:
        return []
    frontier = []
    for step in range(1, points + 1):
        b = budget * step / points
        sub = _greedy(prepared, n_cells, cell_expected, scenario_cell, b, mode, np)
        frontier.append({
            "budget_usd": round(b, 2),
            "people_protected": round(float(sub["portfolio"].mean()) if sub["portfolio"].size else 0.0, 3),
            "co2_t_10yr": round(sum(s["co2_t_10yr"] for s in sub["selected"]), 2),
        })
    return frontier
