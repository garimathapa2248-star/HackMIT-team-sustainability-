# Concept note — nature-based defense, Koshi (Nepal)

**Instrument:** Green Climate Fund / Adaptation Fund screening note (auto-filled)
**Status:** model output — screening-grade optimisation, not an investment recommendation

## 1. Problem

Monsoon floods, rainfall-triggered landslides, and glacial-lake outburst risk concentrate below Tsho Rolpa in the Dudh Koshi. NOAA ISD annual maxima (GEV) show the early-period 1-in-100-year daily rainfall depth now has a fitted recurrence of **7.75 years** in the late-period sample ([1979, 1999] vs [2000, 2024]). Trend in annual maxima: **13.116 mm/decade**.

Observed lake-area change 1990–2024: Imja Tsho +113.3%, Thulagi +30.3%, Tsho Rolpa +26.6%.

## 2. Evidence

- **Stations:** 72 / **station-years:** 1511 (NOAA ISD).
- **Return levels (mm):** {'2': 32.266, '5': 56.954, '10': 73.55, '25': 94.81, '50': 110.793, '100': 126.84} with bootstrapped 95% CIs.
- **Landslide:** rainfall classifier, AUC out-of-sample — not a Caine-style I–D threshold; AUC 0.934 on 138 events, test [2016, 2017].
- **Backtest:** SAR backtest not yet validated — critical_success_index is null; this note does not invent a score.
- **Hazard layer:** Hazard/candidates are screening-grade until the DEM/HAND twin replaces artifacts/hazard.geojson.

## 3. Intervention

Portfolio of nature-based parcels (vetiver, bamboo, afforestation, floodplain/wetland restore, riverbank bioengineering) selected by marginal greedy triple-return per dollar with per-cell EAL capping and Monte-Carlo climate noise from the GEV 100-year CI.

## 4. Budget and expected impact

| Item | Value |
|---|---|
| Budget (USD) | 2,000,000 |
| Mode | expected |
| Parcels selected | 170 |
| Spend (USD) | 1,995,760 |
| Annual expected people-risk avoided | 582.8 |
| CO₂ sequestered, 10 yr (t) | 26,352 |
| Household income (USD/yr) | 277,452 |
| Households benefiting | 4,821 |

`people_protected` is **annual expected people-risk avoided**, not a count of unique lives.

## 5. M&E

Satellite MRV: annual NDWI lake area, Sentinel-1 flood extent after events, parcel presence via high-res optical. Re-run EVT as NOAA ISD updates.

## 6. Citations (screening-grade factors)

See `plan.provenance.factors` for per-type cost, efficacy, carbon, and income sources.
