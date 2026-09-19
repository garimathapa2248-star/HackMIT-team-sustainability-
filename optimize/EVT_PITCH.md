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
  sensitivity analysis. It is a *different sample* (regional max vs station median-of-maxima) and its
  100-year estimate is much larger, so it does not corroborate or replace the GEV headline.
- **Landslide:** do **not** sell `I = a·D^b` as a Caine threshold (our exponent is positive). Sell it as a
  **rainfall classifier, AUC 0.934 out-of-sample** (train 2008–15, test 2016–17, n=138; 176 events dropped
  for distance, 450 for data gaps — we show the skip counts).
- **Lakes:** Imja Tsho **+113%**, Thulagi +30%, Tsho Rolpa +27% area growth (1990–2024).

## The plan the tail feeds (current numbers)

- **55 deterministic preventive measures** selected, spend **$1.76M of a $2M cap**, greedy marginal
  triple-return/$ with per-cell EAL capping over 500 Monte-Carlo hazard draws. The optimizer does not
  spend the remaining $240k after exhausting the evidence-supported candidate universe.
- **Annual expected people-risk avoided ≈ 16,058/yr** — always say **"annual expected people-risk
  avoided," never "lives."** Expected-value and CVaR select the same 55 measures under the current
  scenario model.
- **7,700 tCO₂ / 10 yr · $66k/yr livelihood income.** The mapped Koshi/Madhesh plains support
  floodplain restoration; the engine also contains vetiver, bamboo, wetland, afforestation, and
  riverbank rules, but it does not force those types into unsupported cells.
- Candidate geometry is the source 8 km hazard cell, not a surveyed parcel boundary. Type and area are
  deterministic screening assumptions with explicit field-verification requirements.

## The proof (don't hide the low CSI)

UNOSAT Sentinel-1, 27 Sep 2024 Koshi flood. Local-min HAND proxy on Copernicus GLO-30, stage calibrated on
this event: **CSI 0.086, POD 0.211, FAR 0.873.** We will not round it up. FAR is high because HAND
over-inundates flats; the model's *use* is relative preventive-measure ranking, not a legal flood zone.
Counterfactual simulation: literature effect sizes reduce observed-flood-weighted exposure by **29.24%**;
this is not an observed intervention trial.
