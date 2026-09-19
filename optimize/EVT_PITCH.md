# 30-second EVT pitch — Voloridge judge

Memorize this. Do **not** say "climate change made storms worse" as the claim. The claim is a **fitted tail**.

## Word-for-word (≈30s)

You already know this math. VaR asks: how bad is the 1-in-100-year loss? Extreme-value theory fits the
*tail* of the distribution instead of pretending the mean describes extremes. We do the same thing to NOAA
ISD station rainfall — **498 stations, 12,066 station-years** across High Mountain Asia, parsed on your
48-core box. Fit a GEV to annual maxima, split the record early vs late. On the **Nepal-adjacent** subset
the 100-year daily depth of 1979–1999 now has a **7.75-year** recurrence in 2000–2024, with bootstrapped
95% CIs on the return-level curve. That tail — not the average monsoon — is the climate uncertainty we feed
the optimizer. Same tail-risk discipline you use on a book, applied to a watershed.

## The honest headline (say the negative control out loud — quants love it)

- **Nepal-adjacent GEV:** old 100-year depth → **7.75-year** recurrence.
- **HMA-pooled (all 498 stations):** **no recurrence shift identified.** We publish the miss.
  Mountain convection + station density ≠ one GEV. The decision unit is the catchment, not the continent.
- **Trend (supporting, not the claim):** annual-max 1-day precip **+5.229 mm/decade, p = 0.00035**.

## If they poke

- **Stationarity:** two-era split, not one stationary GEV for the whole record. Headline is the old
  100-year *depth* evaluated on the late distribution.
- **Uncertainty:** non-parametric bootstrap on return levels; the 100-year CI is wide (52.98–120.75 mm)
  **on purpose** — that width *is* the Monte-Carlo sigma (σ ≈ 0.252) the optimizer samples over 200 draws.
  We feed the optimizer the uncertainty, not a point forecast.
- **Cross-check:** POT/GPD (95th-pct, 3-day decluster of regional daily max) run alongside the GEV as a
  tail sanity check — a *different sample* (regional max vs station median-of-maxima), so it is a
  cross-check, not a replacement headline.
- **Landslide:** do **not** sell `I = a·D^b` as a Caine threshold (our exponent is positive). Sell it as a
  **rainfall classifier, AUC 0.934 out-of-sample** (train 2008–15, test 2016–17, n=138; 176 events dropped
  for distance, 450 for data gaps — we show the skip counts).
- **Lakes:** Imja Tsho **+113%**, Thulagi +30%, Tsho Rolpa +27% area growth (1990–2024).

## The plan the tail feeds (current numbers)

- **127 parcels** selected, spend **$1.99M of $2M**, greedy marginal triple-return/$ with per-cell EAL
  capping over 200 Monte-Carlo hazard draws. **CVaR toggle** optimizes the worst-10% climate draws.
- **Annual expected people-risk avoided ≈ 67,944/yr** — this is **half** of the map's total EAL
  (134,368/yr over a ~8.0M-person Koshi/Madhesh region). Always say **"annual expected people-risk
  avoided," never "lives."**
- **17,554 tCO₂ / 10 yr · $226k/yr household income.** Factors + sources live in `optimize/economics.py`
  (vetiver, bamboo, floodplain, wetland, afforestation, riverbank bio) — answer cost/CO₂/income questions
  from that table, not from memory.

## The proof (don't hide the low CSI)

UNOSAT Sentinel-1, 27 Sep 2024 Koshi flood. Local-min HAND proxy on Copernicus GLO-30, stage calibrated on
this event: **CSI 0.086, POD 0.211, FAR 0.873.** We will not round it up. FAR is high because HAND
over-inundates flats; the model's *use* is relative parcel ranking, not a legal flood zone. Counterfactual:
the plan removes ~**38%** of observed-flood-weighted exposure.
