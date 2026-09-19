# Concept note — nature-based defense, Koshi (Nepal)

**Instrument:** Green Climate Fund / Adaptation Fund screening note (auto-filled)
**Status:** model output — screening-grade optimisation, not an investment recommendation

## 1. Problem

Monsoon floods, rainfall-triggered landslides, and glacial-lake outburst risk concentrate below Tsho Rolpa in the Dudh Koshi. NOAA ISD annual maxima (GEV) show the early-period 1-in-100-year daily rainfall depth now has a fitted recurrence of **7.75 years** in the late-period sample ([1979, 1999] vs [2000, 2024]). Trend in annual maxima: **5.229 mm/decade**.

Observed lake-area change 1990–2024: Imja Tsho +113.3%, Thulagi +30.3%, Tsho Rolpa +26.6%.

## 2. Evidence

- **Stations:** 498 / **station-years:** 12066 (NOAA ISD).
- **Return levels (mm):** {'2': 29.359, '5': 41.664, '10': 49.032, '25': 57.54, '50': 63.321, '100': 68.648} with bootstrapped 95% CIs.
- **Landslide:** rainfall classifier, AUC out-of-sample — not a Caine-style I–D threshold; AUC 0.934 on 138 events, test [2016, 2017].
- **Backtest:** CSI 0.086 (event 2024-09-27)
- **Counterfactual:** Counterfactual exposure 54993.4 → 26845.7 (51.18% reduction; observed-flood × population, not unique lives).
- **POT/GPD cross-check return levels (mm):** {'2': 230.253, '5': 282.957, '10': 324.123, '25': 380.314, '50': 424.203, '100': 469.32}
- **IMERG:** Daily IMERG is not on an unauthenticated public URL. Use Google Earth Engine NASA/GPM_L3/IMERG_V07 or Earthdata if credentials exist. RootLedger's headline remains NOAA ISD GEV.
- **Hazard layer:** D8 HAND on Copernicus GLO-30, stage calibrated to UNOSAT S-1 27 Sep 2024; screening-grade NumPy, not Whitebox.

## 3. Intervention

Portfolio of nature-based parcels (vetiver, bamboo, afforestation, floodplain/wetland restore, riverbank bioengineering) selected by marginal greedy triple-return per dollar with per-cell EAL capping and Monte-Carlo climate noise from the GEV 100-year CI.

## 4. Budget and expected impact

| Item | Value |
|---|---|
| Budget (USD) | 2,000,000 |
| Mode | expected |
| Parcels selected | 127 |
| Spend (USD) | 1,998,560 |
| Annual expected people-risk avoided | 67944.2 |
| CO₂ sequestered, 10 yr (t) | 17,554 |
| Household income (USD/yr) | 226,288 |
| Households benefiting | 915,128 |

`people_protected` is **annual expected people-risk avoided**, not a count of unique lives.

## 5. M&E

Satellite MRV: annual NDWI lake area, Sentinel-1 flood extent after events, parcel presence via high-res optical. Re-run EVT as NOAA ISD updates.

## 6. Citations (screening-grade factors)

See `plan.provenance.factors` for per-type cost, efficacy, carbon, and income sources.
