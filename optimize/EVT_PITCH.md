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
- **ERA5-Land replication (39/73 coordinates; Open-Meteo 429 on the rest):** **partially replicates**
  (16.72-yr vs 7.75-yr). Mean-annmax Pearson r=0.128. Quasi-independent; we show the scatter.
- **Trend (supporting, not the claim):** annual-max 1-day precip **+5.229 mm/decade, p = 0.00035**.

## If they poke

- **Stationarity:** two-era split, not one stationary GEV for the whole record. Headline is the old
  100-year *depth* evaluated on the late distribution.
- **Uncertainty:** non-parametric bootstrap on return levels; the 100-year CI is wide (52.98–120.75 mm)
  **on purpose** — that width *is* the Monte-Carlo sigma (σ ≈ 0.252) the optimizer samples. We feed the
  optimizer the uncertainty, not a point forecast.
- **Cross-check:** POT/GPD is a *different sample* (regional max vs station median-of-maxima) and does not
  replace the GEV headline. IMERG was not fused.
- **Landslide:** do **not** sell `I = a·D^b` as a Caine threshold (our exponent is positive). Sell it as a
  **rainfall classifier, AUC 0.934 out-of-sample** (train 2008–15, test 2016–17, n=138; 176 events dropped
  for distance, 450 for data gaps — we show the skip counts).
- **Lakes:** Imja Tsho **+113%**, Thulagi +30%, Tsho Rolpa +27% area growth (1990–2024).
- **Knapsack:** greedy matches the relaxed independent-value bound (gap 0%). The bound ignores per-cell
  overlap capping, so the true gap is smaller.

## The plan the tail feeds (current numbers)

- **62 deterministic preventive measures** selected, spend **$1.984M of a $2M cap**, greedy marginal
  triple-return/$ with per-cell EAL capping over 500 Monte-Carlo hazard draws.
- **Annual expected people-risk avoided ≈ 26,306/yr** — always say **"annual expected people-risk
  avoided," never "lives."** Equity weight up to 1.5× on low-income rural cells.
- **8,680 tCO₂ / 10 yr · $74.4k/yr livelihood income.** The mapped Koshi/Madhesh plains support
  floodplain restoration; other NbS types exist in the engine and are used in city packs.
- Candidate geometry is the source hazard cell, not a surveyed parcel boundary.

## The proof (don't hide the low CSI)

UNOSAT Sentinel-1, 27 Sep 2024 Koshi flood. Local-min HAND proxy on Copernicus GLO-30, stage calibrated on
this event: **CSI 0.053, POD 0.212, FAR 0.935.** Beats elevation baseline (0.001); **does not beat** JRC
seasonal-water climatology (0.067). Skill vs scale **falls**. Frozen transfer onto ICIMOD 13 Aug 2017
western Terai (not Koshi): **CSI 0.088** vs JRC 0.141. 2024 west/east spatial holdout: CSI 0.056.
Counterfactual simulation: **77,057 → 54,174** exposure units (**29.7%**); not an observed trial.
