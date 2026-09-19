"""Preventive Measures Plan filled only from artifact evidence."""
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


def _field(row: dict, *names: str):
    """Return the first populated candidate evidence field."""
    for name in names:
        value = row.get(name)
        if value not in (None, "", [], {}):
            if isinstance(value, list):
                shown = ", ".join(str(item) for item in value[:3])
                return shown + (f" (+{len(value) - 3} more)" if len(value) > 3 else "")
            if isinstance(value, dict):
                items = list(value.items())
                shown = "; ".join(f"{key}: {val}" for key, val in items[:5])
                return shown + (f"; +{len(items) - 5} more fields" if len(items) > 5 else "")
            return value
    return None


def _priority_table(plan: dict, candidates: list, factors: list, limit: int = 12) -> str:
    by_id = {
        row.get("parcel_id"): row
        for row in candidates
        if isinstance(row, dict) and row.get("parcel_id")
    }
    by_type = {
        row.get("type"): row
        for row in factors
        if isinstance(row, dict) and row.get("type")
    }
    rows = []
    for priority, selected in enumerate((plan.get("selected") or [])[:limit], start=1):
        parcel = by_id.get(selected.get("parcel_id")) or {}
        kind = parcel.get("type") or selected.get("type")
        factor = by_type.get(kind) or {}
        centroid = parcel.get("centroid") or selected.get("centroid")
        coordinates = (
            f"{_n(centroid[1], '.5f')}, {_n(centroid[0], '.5f')}"
            if isinstance(centroid, list) and len(centroid) >= 2
            else "not available"
        )
        suitability_score = _field(
            parcel,
            "suitability_score",
        ) or _field(selected, "suitability_score")
        suitability_basis = _field(
            parcel,
            "suitability",
            "suitability_evidence",
            "suitability_reason",
            "suitability_reasons",
            "selection_reason",
            "rationale",
            "why_suitable",
        ) or _field(
            selected,
            "suitability",
            "suitability_evidence",
            "suitability_reason",
            "suitability_reasons",
            "selection_reason",
            "rationale",
            "why_suitable",
        )
        if suitability_basis is None:
            suitability_basis = (
                f"candidate inputs: slope {_n(parcel.get('slope_deg', selected.get('slope_deg')), '.1f')}°, "
                f"land cover {parcel.get('landcover', selected.get('landcover', 'not available'))}"
            )
        suitability = (
            f"score {suitability_score}; {suitability_basis}"
            if suitability_score is not None
            else str(suitability_basis)
        )
        risk_driver = _field(
            parcel,
            "risk_driver",
            "risk_drivers",
            "triggering_hazard",
            "primary_hazard",
            "hazard_driver",
        ) or _field(
            selected,
            "risk_driver",
            "risk_drivers",
            "triggering_hazard",
            "primary_hazard",
            "hazard_driver",
        ) or factor.get("primary_hazard") or "not available"
        evidence = _field(
            parcel,
            "evidence",
            "evidence_source",
            "evidence_sources",
            "data_sources",
            "source",
            "provenance",
            "verification",
            "required_verification",
        ) or _field(
            selected,
            "evidence",
            "evidence_source",
            "evidence_sources",
            "data_sources",
            "source",
            "provenance",
            "verification",
            "required_verification",
        ) or factor.get("source") or "not available"
        rows.append(
            f"| {priority} | {selected.get('parcel_id')} | {kind or 'not available'} | "
            f"{coordinates} | {_n(selected.get('cost_usd'))} | "
            f"{_n(selected.get('avoided_eal_people'), '.1f')} | {risk_driver} | "
            f"{suitability} | {evidence} |"
        )
    if not rows:
        return "_No selected interventions are available._"
    header = (
        "| Priority | Measure ID | Measure | Coordinates (lat, lon) | Budget USD | "
        "Annual expected people-risk avoided | Risk driver | Suitability evidence | Evidence basis |\n"
        "|---:|---|---|---|---:|---:|---|---|---|"
    )
    return header + "\n" + "\n".join(rows)


def _budget_table(plan: dict, candidates: list) -> str:
    by_id = {
        row.get("parcel_id"): row
        for row in candidates
        if isinstance(row, dict) and row.get("parcel_id")
    }
    totals: dict[str, dict[str, float]] = {}
    for selected in plan.get("selected") or []:
        kind = (
            (by_id.get(selected.get("parcel_id")) or {}).get("type")
            or selected.get("type")
            or "unclassified"
        )
        row = totals.setdefault(kind, {"count": 0.0, "cost": 0.0, "people_risk": 0.0})
        row["count"] += 1
        row["cost"] += float(selected.get("cost_usd") or 0)
        row["people_risk"] += float(selected.get("avoided_eal_people") or 0)
    if not totals:
        return "_No selected interventions are available._"
    rows = [
        f"| {kind} | {_n(values['count'])} | {_n(values['cost'])} | "
        f"{_n(values['people_risk'], '.1f')} |"
        for kind, values in sorted(totals.items(), key=lambda item: -item[1]["people_risk"])
    ]
    return (
        "| Measure | Sites | Modeled spend USD | Annual expected people-risk avoided |\n"
        "|---|---:|---:|---:|\n" + "\n".join(rows)
    )


def render() -> str:
    signal = loader.load("signal") or {}
    plan = loader.load("plan") or {}
    backtest = loader.load("backtest") or {}
    candidates = loader.load("candidates") or []
    h = signal.get("headline") or {}
    t = plan.get("totals") or {}
    ls = signal.get("landslide_trigger") or {}
    lakes = signal.get("lake_growth") or []
    factors = (plan.get("provenance") or {}).get("factors") or []
    lake_line = ", ".join(
        f"{x.get('name')} +{x.get('pct_growth')}%" for x in lakes
    ) or "not available"
    csi = backtest.get("critical_success_index")
    csi_line = (
        f"CSI {csi}, POD {backtest.get('hit_rate_pod')}, FAR {backtest.get('false_alarm_ratio')} "
        f"(event {backtest.get('event_date')}; calibration-event fit, not independent validation)"
        if csi is not None
        else "Calibration-event metrics are unavailable; this plan does not invent a score."
    )
    cf = (backtest.get("counterfactual") or {})
    cf_line = (
        f"Counterfactual exposure {cf.get('people_exposed_baseline')} → {cf.get('people_exposed_with_plan')} "
        f"({cf.get('reduction_pct')}% reduction; simulation using observed-flood fraction × population, "
        "not observed outcomes or unique lives)."
        if cf.get("people_exposed_baseline") is not None
        else "Counterfactual not yet filled."
    )
    haz_note = (backtest.get("provenance") or {}).get("method") or (
        "Copernicus GLO-30 local-min HAND proxy; stage calibrated on this event."
    )
    pot = (signal.get("pot_gpd") or {}).get("return_levels_mm")
    imerg = (signal.get("imerg") or {}).get("reason") or "IMERG not fused."
    priorities = _priority_table(plan, candidates, factors)
    budget = _budget_table(plan, candidates)
    factor_lines = "\n".join(
        f"- **{row.get('type')}** — cost {_n(row.get('cost_per_ha'))} USD/ha; "
        f"effect fraction {_n(row.get('eal_reduction_frac'), '.2f')}; "
        f"carbon {_n(row.get('co2_t_per_ha_10yr'), '.1f')} tCO₂/ha/10yr; "
        f"income {_n(row.get('income_usd_per_ha_yr'))} USD/ha/yr. Source: {row.get('source')} "
        "**[literature assumption]**"
        for row in factors
    ) or "- No factor assumptions are available."
    return f"""# Preventive Measures Plan — {signal.get('region', 'watershed')}

**Purpose:** screening-grade, funder-oriented preventive action plan (auto-filled from artifacts)
**Portfolio status:** {(plan.get('provenance') or {}).get('data_status', 'model output')}
**Evidence labels:** observed data · model output · literature assumption · counterfactual simulation

## 1. Decision context

{h.get('statement') or 'Rainfall return periods are unavailable.'} **[model output from observed NOAA ISD]**

Annual-max trend: **{_n((signal.get('trend') or {}).get('slope_mm_per_decade'), '.3f')} mm/decade**. **[model output]**

Lake-area series summary: {lake_line}. **[observed/derived inventory data]**

## 2. Evidence register

- **Observed data:** {signal.get('stations_processed')} NOAA stations / {signal.get('station_years')} station-years; UNOSAT Sentinel-1 flood extent for {backtest.get('event_date')}; observed flood area {_n(backtest.get('observed_flood_km2'), '.2f')} km².
- **Model output:** GEV return levels {signal.get('return_levels_mm')} with bootstrap intervals {signal.get('return_levels_ci95')}; landslide {(ls.get('presentation') or 'rainfall classifier')} with held-out AUC {ls.get('auc')} on {ls.get('n_events')} events; modeled flood area {_n(backtest.get('modeled_flood_km2'), '.2f')} km².
- **Hazard method:** {haz_note}. This is a **local-min HAND proxy calibrated on this event**, not Whitebox HAND or an independently validated hydrodynamic model.
- **Calibration-event metrics:** {csi_line}.
- **Counterfactual simulation:** {cf_line}
- **Tail cross-check:** POT/GPD return levels {pot or "not available"} **[model output; different sample from the GEV headline]**.
- **Data gap:** {imerg}

## 3. Prioritized preventive interventions

Priority follows the optimizer's selected order. Coordinates are candidate centroids in EPSG:4326 and require site verification before procurement.

{priorities}

## 4. Budget and modeled outputs

{budget}

- Budget ceiling: **${_n(plan.get('budget_usd'))}**; modeled spend: **${_n(t.get('cost_usd'))}**; mode: **{plan.get('mode')}**.
- Annual expected people-risk avoided: **{_n(t.get('people_protected'), '.1f')}** **[model output; not unique people or observed lives saved]**.
- Ten-year carbon: **{_n(t.get('co2_t_10yr'))} tCO₂** **[model output from literature factors]**.
- Annual livelihood-income potential: **${_n(t.get('income_usd_yr'))}** **[model output from per-hectare literature assumptions; not measured income, jobs, wages, or households reached]**.

## 5. Assumptions and evidence basis

{factor_lines}

The optimizer applies marginal greedy triple-return per dollar, per-cell EAL capping, and Monte-Carlo climate multipliers derived from the GEV 100-year confidence interval. **[model design assumption]**

No causal percentage is assigned to government, communities, or households. Implementation roles require local governance and community confirmation.

## 6. Monitoring and verification

- **Rainfall signal:** append observed NOAA ISD records annually; re-fit GEV and publish sample size, confidence interval, and any changed recurrence estimate.
- **Flood extent:** after qualifying events, derive observed Sentinel-1 extent and report POD, FAR, and CSI separately from the calibration event.
- **Intervention delivery:** verify each parcel centroid, boundary, measure type, area, and installation date through field sign-off plus dated optical imagery.
- **Carbon:** report planted/restored area and survival first; convert to tCO₂ only with the stated factor and uncertainty. Ground-sample biomass before claiming credits.
- **Risk performance:** compare post-event observed exposure with a pre-registered baseline; do not present the counterfactual simulation as an observed outcome.
- **Livelihoods:** measure participant payments or income directly before making beneficiary, household, job, or wage claims.

## 7. Limitations

- The flood surface is a screening-grade **local-min HAND proxy calibrated on the 27 Sep 2024 event**. Its event-fit CSI is low and is not independent validation.
- Hazard depths, EAL, avoided people-risk, carbon, income, and the optimized ranking are model outputs; field feasibility, tenure, ecological safeguards, and engineering design remain unverified.
- Candidate centroids are screening locations, not surveyed parcel boundaries.
- Literature effect sizes and unit costs may not transfer to local implementation conditions.
- The counterfactual is a simulation, not a prediction or measured causal effect.
- IMERG was not fused, and the HMA-pooled late GEV did not identify the Nepal-adjacent headline shift.
"""


def render_pdf() -> bytes:
    """Minimal multi-page PDF from the markdown plan. No extra dependency."""
    text = render().replace("# ", "").replace("**", "")
    lines = []
    for raw in text.splitlines():
        raw = (
            raw.replace("→", "->")
            .replace("–", "-")
            .replace("—", "-")
            .replace("₂", "2")
            .replace("·", "|")
            .replace("°", " degrees")
        )
        while len(raw) > 92:
            cut = raw.rfind(" ", 0, 92)
            if cut < 20:
                cut = 92
            lines.append(raw[:cut])
            raw = raw[cut:].lstrip()
        lines.append(raw)
    pages = [lines[index:index + 52] for index in range(0, len(lines), 52)] or [[]]
    font_id = 3 + 2 * len(pages)
    objects: dict[int, bytes] = {
        1: b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        font_id: (
            f"{font_id} 0 obj << /Type /Font /Subtype /Type1 "
            "/BaseFont /Helvetica >> endobj\n"
        ).encode(),
    }
    page_ids = []
    for index, page_lines in enumerate(pages):
        page_id = 3 + 2 * index
        content_id = page_id + 1
        page_ids.append(page_id)
        content = ["BT /F1 10 Tf 48 780 Td"]
        for line_index, line in enumerate(page_lines):
            safe = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
            if line_index:
                content.append("0 -13 Td")
            content.append(f"({safe}) Tj")
        content.append("ET")
        stream = "\n".join(content).encode("latin-1", "replace")
        objects[page_id] = (
            f"{page_id} 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
            f"/Contents {content_id} 0 R /Resources << /Font << /F1 {font_id} 0 R >> >> "
            ">> endobj\n"
        ).encode()
        objects[content_id] = (
            f"{content_id} 0 obj << /Length {len(stream)} >> stream\n".encode()
            + stream
            + b"\nendstream endobj\n"
        )
    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[2] = (
        f"2 0 obj << /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >> endobj\n"
    ).encode()

    out = bytearray(b"%PDF-1.4\n")
    offsets = [0]
    for object_id in range(1, font_id + 1):
        offsets.append(len(out))
        out.extend(objects[object_id])
    xref = len(out)
    out.extend(f"xref\n0 {font_id + 1}\n0000000000 65535 f \n".encode())
    for off in offsets[1:]:
        out.extend(f"{off:010d} 00000 n \n".encode())
    out.extend(
        f"trailer << /Size {font_id + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref}\n%%EOF\n".encode()
    )
    return bytes(out)
