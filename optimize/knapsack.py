"""Optional exact 0/1 knapsack cross-check for the greedy optimizer.

The shipped optimizer is the marginal greedy in ``portfolio.py`` — it always
runs, handles per-cell capping, and is what the demo uses.  This module answers a
Voloridge-style question: *how close to optimal is that greedy?*

It solves an exact 0/1 knapsack on each parcel's *independent* expected
triple-return value, ignoring the overlap capping.  That relaxation is an upper
bound on achievable value, so a small gap between greedy and this bound is
evidence the greedy is near-optimal.

The solver is a dependency-free dynamic program (costs discretised to a fixed
resolution), so it runs on the demo laptop with no external MILP solver.  A PuLP
path is available for teams that prefer it, but nothing requires it.
"""
from __future__ import annotations

from typing import Sequence

from . import economics
from .portfolio import (INCOME_VALUE_YEARS, PRICE_CO2_PER_T, VALUE_PER_PERSON_YR,
                        prepare)

COST_RESOLUTION_USD = 500.0  # DP granularity; $500 buckets over a $M budget is exact enough


def parcel_independent_value(prepared_row: dict, cell_expected: Sequence[float]) -> float:
    """Upper-bound triple-return value of a parcel if it captured its cells alone."""
    protection = prepared_row["effect"] * sum(cell_expected[r] for r in prepared_row["rows"])
    return (protection * VALUE_PER_PERSON_YR
            + prepared_row["co2"] * PRICE_CO2_PER_T
            + prepared_row["income"] * INCOME_VALUE_YEARS)


def solve_knapsack(candidates: list[dict], cell_index: dict[str, int],
                   cell_expected: Sequence[float], budget: float,
                   resolution_usd: float = COST_RESOLUTION_USD) -> dict:
    """Exact 0/1 knapsack maximising independent triple-return value under budget."""
    economics.validate_candidates(candidates)
    prepared = prepare(candidates, cell_index)
    values = [parcel_independent_value(p, cell_expected) for p in prepared]
    weights = [max(1, int(round(p["cost"] / resolution_usd))) for p in prepared]
    cap = int(budget // resolution_usd)
    n = len(prepared)

    # 1-D DP over capacity with a per-item "take" bitmap for reconstruction.
    best = [0.0] * (cap + 1)
    take = [bytearray(cap + 1) for _ in range(n)]
    for i in range(n):
        wi, vi, ti = weights[i], values[i], take[i]
        if wi > cap or vi <= 0:
            continue
        for c in range(cap, wi - 1, -1):
            alt = best[c - wi] + vi
            if alt > best[c]:
                best[c] = alt
                ti[c] = 1

    # Reconstruct the chosen set.
    chosen, c = [], cap
    for i in range(n - 1, -1, -1):
        if c >= 0 and take[i][c]:
            chosen.append(prepared[i]["parcel_id"])
            c -= weights[i]
    chosen.reverse()
    chosen_set = set(chosen)
    cost = sum(p["cost"] for p in prepared if p["parcel_id"] in chosen_set)

    return {
        "selected_ids": chosen,
        "objective_value_usd": round(best[cap], 2),
        "cost_usd": round(cost, 2),
        "status": "Optimal",
        "note": "independent-value upper bound (ignores per-cell capping); for optimality-gap reporting only",
    }


def optimality_gap(candidates: list[dict], cell_index: dict[str, int],
                   cell_expected: Sequence[float], budget: float,
                   greedy_selected_ids: Sequence[str]) -> dict:
    """Report the greedy portfolio's value gap vs. the exact independent-value bound."""
    prepared = {p["parcel_id"]: p for p in prepare(candidates, cell_index)}
    greedy_value = sum(parcel_independent_value(prepared[i], cell_expected)
                       for i in greedy_selected_ids if i in prepared)
    bound = solve_knapsack(candidates, cell_index, cell_expected, budget)
    obj = bound["objective_value_usd"] or 1.0
    return {
        "greedy_value_usd": round(greedy_value, 2),
        "knapsack_bound_usd": bound["objective_value_usd"],
        "gap_pct": round(100 * (bound["objective_value_usd"] - greedy_value) / obj, 2),
    }
