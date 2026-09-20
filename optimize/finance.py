"""Screening-grade NPV / IRR / climate multiplier (FloodAdapt + CLIMADA finance).

Does not call climada.util.finance or FloodAdapt BenefitRunner. Discount rates,
O&M, and the climate multiplier are documented assumptions.
"""
from __future__ import annotations

from typing import Any

VALUE_PER_PERSON_YR = 5000.0
DISCOUNT_PRIMARY = 0.03
DISCOUNT_ALT = 0.07
OM_FRAC = 0.02
START_YEAR = 2024
END_YEAR = 2050
FREQ_MULT_CAP = 5.0


def climate_freq_mult(signal: dict | None) -> tuple[float, str]:
    """Scale annual people-risk from the GEV recurrence shift, capped.

    The old 100-year depth arriving every 7.75 years is *not* a claim that all
    floods become 12.9× more frequent. We cap at 5× and label it screening.
    """
    headline = (signal or {}).get("headline") or {}
    try:
        old = float(headline.get("old_return_period_yrs") or 100)
        new = float(headline.get("new_return_period_yrs"))
    except (TypeError, ValueError):
        return 1.0, "No usable GEV recurrence in this pack; climate multiplier = 1."
    if new != new or new <= 0 or new > 500:
        return 1.0, "No credible late-sample recurrence; climate multiplier = 1."
    raw = old / new
    capped = min(raw, FREQ_MULT_CAP)
    return round(capped, 3), (
        f"Screening climate multiplier is min({old:g}/{new:.2f}, {FREQ_MULT_CAP:g}) = {capped:.2f}. "
        "It scales annual people-risk under constant measure efficacy — not a hydrodynamic future flood."
    )


def _lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def irr(cashflows: list[float]) -> float | None:
    """Bisection IRR; None if the sign never flips."""
    if not cashflows or all(x >= 0 for x in cashflows) or all(x <= 0 for x in cashflows):
        return None

    def npv_at(rate: float) -> float:
        total = 0.0
        for t, cf in enumerate(cashflows):
            total += cf / ((1.0 + rate) ** t)
        return total

    lo, hi = -0.9, 10.0
    f_lo, f_hi = npv_at(lo), npv_at(hi)
    if f_lo * f_hi > 0:
        return None
    for _ in range(80):
        mid = 0.5 * (lo + hi)
        f_mid = npv_at(mid)
        if f_lo * f_mid <= 0:
            hi, f_hi = mid, f_mid
        else:
            lo, f_lo = mid, f_mid
    return round(0.5 * (lo + hi), 4)


def npv_block(
    *,
    capex_usd: float,
    people_protected: float,
    freq_mult: float,
    value_per_person: float = VALUE_PER_PERSON_YR,
    discount: float = DISCOUNT_PRIMARY,
    om_frac: float = OM_FRAC,
    start: int = START_YEAR,
    end: int = END_YEAR,
) -> dict[str, Any]:
    years = list(range(start, end + 1))
    n = max(1, len(years) - 1)
    om = float(capex_usd) * om_frac
    series = []
    cashflows = []
    benefits_npv = 0.0
    costs_npv = 0.0
    for i, year in enumerate(years):
        scale = _lerp(1.0, float(freq_mult), i / n)
        benefit = float(people_protected) * value_per_person * scale
        cost = (float(capex_usd) if i == 0 else 0.0) + om
        df = 1.0 / ((1.0 + discount) ** i)
        benefits_npv += benefit * df
        costs_npv += cost * df
        net = benefit - cost
        cashflows.append(net)
        series.append({
            "year": year,
            "benefits_usd": round(benefit, 2),
            "costs_usd": round(cost, 2),
            "net_usd": round(net, 2),
            "benefits_discounted_usd": round(benefit * df, 2),
            "costs_discounted_usd": round(cost * df, 2),
        })
    npv = benefits_npv - costs_npv
    bcr = round(benefits_npv / costs_npv, 3) if costs_npv > 0 else None
    alt = npv_block(
        capex_usd=capex_usd,
        people_protected=people_protected,
        freq_mult=freq_mult,
        value_per_person=value_per_person,
        discount=DISCOUNT_ALT,
        om_frac=om_frac,
        start=start,
        end=end,
    ) if discount == DISCOUNT_PRIMARY else None
    payload = {
        "horizon": [start, end],
        "discount_rate": discount,
        "implementation_cost_usd": round(float(capex_usd), 2),
        "annual_maint_cost_usd": round(om, 2),
        "om_frac_of_capex_yr": om_frac,
        "benefits_npv_usd": round(benefits_npv, 2),
        "costs_npv_usd": round(costs_npv, 2),
        "npv_usd": round(npv, 2),
        "bcr_npv": bcr,
        "irr": irr(cashflows),
        "series": series,
        "note": (
            "FloodAdapt-style discounted benefits minus capex + 2%/yr O&M. "
            "Not a GCF appraisal and not a field cash-flow."
        ),
    }
    if alt is not None:
        payload["alt_discount_rate"] = DISCOUNT_ALT
        payload["npv_usd_at_alt"] = alt["npv_usd"]
        payload["bcr_npv_at_alt"] = alt["bcr_npv"]
    return payload
