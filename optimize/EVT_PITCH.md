# 30-second EVT pitch — Voloridge judge

Memorize this. Do not say “climate change made storms worse” as the claim. The claim is a **fitted tail**.

## Word-for-word (≈30s)

You already know this math. VaR asks: how bad is the 1-in-100-year loss? Extreme-value theory fits the *tail* of the distribution instead of pretending the mean describes extremes. We do the same thing to NOAA station rainfall — 72 stations, 1,511 station-years. Fit a GEV to annual maxima, split the record early versus late. The 100-year daily depth from 1979–1999 now has a **7.75-year** recurrence in 2000–2024, with bootstrapped 95% CIs on the return-level curve. That tail — not the average monsoon — is the climate uncertainty we feed the optimizer. Same tail-risk discipline you use on a book; applied to a watershed.

## If they poke

- **Stationarity:** two-era split, not a single stationary GEV for the whole record. Headline is the old 100-year *depth* evaluated on the late distribution.
- **Uncertainty:** non-parametric bootstrap on return levels; the optimizer’s Monte-Carlo sigma is taken from the 100-year CI width.
- **Landslide:** do **not** sell `I = a·D^b` as a Caine threshold (our exponent is positive). Sell **rainfall classifier, AUC 0.934 out-of-sample (2016–17)**.
- **Plan spend:** current `plan.json` exhausts a **2-parcel fixture** (~$25.6k of $2M). Re-run when Subodh ships real `candidates.json`.
