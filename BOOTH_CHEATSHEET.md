# RootLedger — booth cheat-sheet (keep on your phone)

## 🎯 One-liner
RootLedger reads decades of weather + satellite data to find where a mountain valley is most in danger, then
tells you exactly where to invest in **natural defenses** to protect the most lives, store the most carbon, and
create the most local income per dollar — and it proves the plan against real past floods, including the misses.

**v1 booth URL:** `http://127.0.0.1:5173/?v=1` → **Play 90-second demo** (or press `D`). Cues: Proof → 2017 → Noise → Tail → Plan → Ask → Export.
Keyboard: `1`–`6` chapters, `→` next beat, `Esc` landing. Full words: `DEMO_SCRIPT.md`.

**Analogy:** Google Maps + a financial advisor + a weather historian, working together to protect mountain towns —
and it writes the funding application at the end.

---

## 🗣️ 30-second EVT (Voloridge judge — Jeevith)

You already know this math. VaR asks: how bad is the 1-in-100-year loss? Extreme-value theory fits the *tail*
instead of pretending the mean describes extremes. We do that to NOAA ISD rainfall — **498 stations, 12,066
station-years** across High Mountain Asia, on your 48-core box. Fit a GEV to annual maxima, split early vs late.
On the **Nepal-adjacent** subset the 100-year daily depth from 1979–1999 now recurs every **7.75 years** in
2000–2024, with bootstrapped 95% CIs on the return-level curve. That tail is the climate uncertainty in the
optimizer — same tail-risk discipline you use on a book, applied to a watershed.

**Say the negative control** (quants love it): the **HMA-pooled** GEV over all 498 stations shows **no
recurrence shift** — we published the miss; the decision unit is the catchment, not the continent.

**Say the replication:** ERA5-Land at 39 of the same 73 coordinates **partially replicates** (16.72-yr vs
7.75-yr). Scatter is on the Signal tab. IMERG not fused.

**Do not say:** the landslide `I = a·D^b` is a Caine threshold (exponent is positive). Say: rainfall classifier,
**AUC 0.934 out-of-sample** (test 2016–17, n=138).

**Do not say:** “same valley” for 2017, or that we beat JRC.

---

## 🗣️ 30-second version (memorize this)
"In the Himalaya, glacial-lake floods, monsoon floods, and landslides destroy towns — and everyone just builds
*warning* tools. We built the *prevention* tool. RootLedger uses free satellite and weather data to map who's in
danger, then — like a financial advisor for nature — it finds the best places to restore floodplains and plant
so each dollar avoids the most people-risk, stores the most carbon, and pays the most local income. An AI writes
the actual funding application, and we backtested the flood layer against the 2024 Koshi radar flood and a 2017
transfer event — including where climatology still wins."

---

## Frozen numbers (do not round CSI up)

| Claim | Number | Label |
|---|---|---|
| Nepal-adjacent recurrence | 7.75 yr | model output from observed ISD |
| HMA pool | no shift | negative control |
| ERA5 replication | 16.72 yr, partial | 39/73 stations |
| 2024 CSI / POD / FAR | 0.053 / 0.212 / 0.935 | in-sample |
| JRC 2024 CSI | 0.067 | we lose |
| 2017 transfer CSI | 0.088 | frozen; not same valley |
| Spatial holdout CSI | 0.056 | 2024 west/east |
| Plan | 62 sites, $1.984M / $2M | 26,306 people-risk / yr |
| CO₂ / income | 8,680 t / $74.4k/yr | literature factors |
| Knapsack gap | 0% | relaxed independent-value bound |
| Equity | up to 1.5× | in EAL, not a slide |
| Counterfactual | 77,057 → 54,174 (29.7%) | simulation |

---

## 🗣️ 2-minute version (the flow)
1. **Problem:** Himalaya = GLOFs + floods + landslides. Everyone warns; nobody helps *prevent*.
2. **Proof:** UNOSAT 2024 in-sample CSI 0.053; 2017 ICIMOD transfer CSI 0.088; JRC still ahead; we say so.
3. **The signal:** 498 stations / 12,066 station-years; 7.75-yr Nepal-adjacent; HMA no shift; ERA5 partial.
4. **The decision:** $2M → 62 floodplain sites, equity-weighted, knapsack-checked.
5. **Triple return:** people-risk avoided + carbon + livelihood income (screening, not measured impact).
6. **AI + export:** grounded answers; screening prevention plan PDF.
7. **Any city:** Bengaluru + Kathmandu packs; CSI null unless SAR is wired.

---

## ✅ Booth do's
- Lead with the *new* thing: two-event proof + ERA5 replication + the JRC miss.
- Vocabulary: out-of-sample, transfer (not same-valley), negative control, CVaR, calibration vs validation.
- Offline: `VITE_USE_CACHE=true` build. Do not let a live `/optimize` overwrite frozen `plan.json`.

## 🚫 Don't
- “Same valley” for 2017.
- “Beats climatology.”
- “Saved 26,306 people.”
- “Skill rises at coarser scale” (it falls on 2024).
- Household counts or responsibility percentages.
