"""GCF-shaped concept note filled only from artifacts."""
from __future__ import annotations

from . import loader


def _n(v, spec=","):
    if v is None:
        return "not available"
    try:
        if spec == ",":
            return f"{float(v):,.0f}"
        return format(float(v), spec)
    except (TypeError, ValueError):
        return str(v)


def render() -> str:
    signal = loader.load("signal") or {}
    plan = loader.load("plan") or {}
    backtest = loader.load("backtest") or {}
    h = signal.get("headline") or {}
    t = plan.get("totals") or {}
    ls = signal.get("landslide_trigger") or {}
    lakes = signal.get("lake_growth") or []
    lake_line = ", ".join(
        f"{x.get('name')} +{x.get('pct_growth')}%" for x in lakes
    ) or "not available"
    csi = backtest.get("critical_success_index")
    csi_line = (
        f"CSI {csi} (event {backtest.get('event_date')})"
        if csi is not None
        else "SAR backtest not yet validated — critical_success_index is null; this note does not invent a score."
    )
    cf = (backtest.get("counterfactual") or {})
    cf_line = (
        f"Counterfactual exposure {cf.get('people_exposed_baseline')} → {cf.get('people_exposed_with_plan')} "
        f"({cf.get('reduction_pct')}% reduction; observed-flood × population, not unique lives)."
        if cf.get("people_exposed_baseline") is not None
        else "Counterfactual not yet filled."
    )
    haz_note = (backtest.get("provenance") or {}).get("method") or (
        "D8 HAND on Copernicus GLO-30; screening-grade NumPy."
    )
    pot = (signal.get("pot_gpd") or {}).get("return_levels_mm")
    imerg = (signal.get("imerg") or {}).get("reason") or "IMERG not fused."
    return f"""# Concept note — nature-based defense, {signal.get('region', 'watershed')}

**Instrument:** Green Climate Fund / Adaptation Fund screening note (auto-filled)
**Status:** {(plan.get('provenance') or {}).get('data_status', 'model output')}

## 1. Problem

{h.get('statement') or 'Rainfall return periods from the city-pack signal.'} Trend in annual maxima: **{_n((signal.get('trend') or {}).get('slope_mm_per_decade'), '.3f')} mm/decade** ({h.get('early_period')} vs {h.get('late_period')}).

Observed lake-area change: {lake_line}. Data status: {(signal.get('provenance') or {}).get('data_status', 'see signal.json')}.

## 2. Evidence

- **Stations / series:** {signal.get('stations_processed')} / **station-years:** {signal.get('station_years')}.
- **Return levels (mm):** {signal.get('return_levels_mm')} with bootstrapped 95% CIs.
- **Landslide:** {(ls.get('presentation') or 'rainfall classifier')}; AUC {ls.get('auc')} on {ls.get('n_events')} events, test {ls.get('test_period')}.
- **Backtest:** {csi_line}
- **Counterfactual:** {cf_line}
- **POT/GPD cross-check return levels (mm):** {pot or "not available"}
- **IMERG:** {imerg}
- **Hazard layer:** {haz_note}

## 3. Intervention

Portfolio of nature-based parcels (vetiver, bamboo, afforestation, floodplain/wetland restore, riverbank bioengineering) selected by marginal greedy triple-return per dollar with per-cell EAL capping and Monte-Carlo climate noise from the GEV 100-year CI.

## 4. Budget and expected impact

| Item | Value |
|---|---|
| Budget (USD) | {_n(plan.get('budget_usd'))} |
| Mode | {plan.get('mode')} |
| Parcels selected | {len(plan.get('selected') or [])} |
| Spend (USD) | {_n(t.get('cost_usd'))} |
| Annual expected people-risk avoided | {_n(t.get('people_protected'), '.1f')} |
| CO₂ sequestered, 10 yr (t) | {_n(t.get('co2_t_10yr'))} |
| Household income (USD/yr) | {_n(t.get('income_usd_yr'))} |
| Households benefiting | {_n(t.get('households_benefiting'))} |

`people_protected` is **annual expected people-risk avoided**, not a count of unique lives.

## 5. M&E

Satellite MRV: annual NDWI lake area, Sentinel-1 flood extent after events, parcel presence via high-res optical. Re-run EVT as NOAA ISD updates.

## 6. Citations (screening-grade factors)

See `plan.provenance.factors` for per-type cost, efficacy, carbon, and income sources.
"""


def render_pdf() -> bytes:
    """Minimal one-column PDF from the markdown note. No extra dependency."""
    text = render().replace("# ", "").replace("**", "")
    lines = []
    for raw in text.splitlines():
        raw = raw.replace("→", "->")
        while len(raw) > 92:
            cut = raw.rfind(" ", 0, 92)
            if cut < 20:
                cut = 92
            lines.append(raw[:cut])
            raw = raw[cut:].lstrip()
        lines.append(raw)
    lines = lines[:90]
    content = ["BT /F1 10 Tf 48 780 Td"]
    for i, line in enumerate(lines):
        safe = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        if i:
            content.append("0 -13 Td")
        content.append(f"({safe}) Tj")
    content.append("ET")
    stream = "\n".join(content).encode("latin-1", "replace")
    objs = []
    objs.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
    objs.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n")
    objs.append(
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n"
    )
    objs.append(b"4 0 obj << /Length " + str(len(stream)).encode() + b" >> stream\n" + stream + b"\nendstream endobj\n")
    objs.append(b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n")
    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objs:
        offsets.append(len(out))
        out.extend(obj)
    xref = len(out)
    out.extend(f"xref\n0 {len(objs)+1}\n0000000000 65535 f \n".encode())
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode())
    out.extend(
        f"trailer << /Size {len(objs)+1} /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )
    return bytes(out)
