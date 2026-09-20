# RootLedger, Devpost answers

Swap the bracketed names for your teammates before you submit.

---

## Inspiration

On 27 September 2024 the Koshi river flooded in eastern Nepal. We went looking at what
technology existed for that valley and found the same thing everywhere: warning systems.
Flood Hub, SMS alerts, sirens, dashboards. All of them answer one question, which is
whether water is coming.

Nobody was answering the question a district engineer in Nepal actually asks, which is
what do I build, and where, with the money I have, so that the next flood is smaller.
That gap bothered us. A warning tells a family to run. It does not stop the same house
from flooding again next monsoon.

The other half of the inspiration was the Voloridge challenge. They handed us a pile of
messy public data and told us to find signal in it. We thought the most useful signal you
could pull out of decades of raw rain records was not a forecast, it was a question about
whether the rules have already changed.

## What it does

RootLedger turns free public data into a prevention plan you can actually fund.

It does three things in order. First it reads decades of raw weather station records across
the Himalaya and works out how the extremes have shifted. The answer for the Nepal
stations was ugly: the daily rainfall that used to be a once a century event now fits a
recurrence of about 7.75 years.

Second it builds a map of where that water ends up, and checks that map against satellite
radar images of real floods instead of asking you to trust it.

Third, and this is the part we care about most, it takes a budget and spends it. Give it
two million dollars and it returns 62 specific sites with real coordinates for floodplain
restoration and planting. That plan is scored on three things at once: about 26,306 people
of expected annual flood exposure avoided, 8,680 tonnes of CO2 over ten years, and $74,400
a year of modelled income for the farmers who would grow those defences. Poorer areas carry
up to 1.5x weight inside the optimiser itself rather than in a paragraph at the end.

Then there is an assistant that can only answer with numbers from our own generated files,
and a one click export of the plan document a local government could take to a funder.

## How we built it

The whole thing is a pipeline of frozen JSON files. Each stage writes one artifact, the
next stage reads it, and the frontend only ever reads artifacts. That meant four people
could work at the same time without touching each other's code.

**Signal.** We parsed NOAA Integrated Surface Database hourly records off S3 for 498
stations across High Mountain Asia, which comes to 12,066 station years. The raw format is
fixed width with sentinel values, duplicate days and accumulation windows that overlap, so
most of the work was cleaning rather than fitting. Voloridge gave us a 48 core AWS box at
their booth and the full parse ran there. We then fit a generalised extreme value
distribution to the annual maximum daily rainfall, split into an early era and a late era,
and compared the return levels.

**Controls.** We did not want to report a number we had accidentally manufactured, so we
ran two checks. One was a negative control, the same fit pooled across all of High Mountain
Asia, which showed no shift. The other was an independent refit on ERA5-Land reanalysis at
39 of the same 73 coordinates, which agreed on direction but came out at 16.72 years
instead of 7.75. Both of those weaken our headline and both are in the demo.

**Hazard.** A local minimum HAND proxy built on Copernicus GLO-30 elevation, with the stage
calibrated against the UNOSAT Sentinel-1 flood extent for 27 September 2024. Monsoon cloud
makes optical imagery useless in exactly the week you need it, so radar was the only
sensible ground truth. We scored it properly with CSI, POD and FAR, then froze every
parameter and replayed a completely separate 2017 flood product from ICIMOD that the model
had never seen.

**Decision.** A greedy portfolio optimiser over the candidate sites with a Monte Carlo draw
over climate uncertainty, a CVaR reranking for the worst 10% of draws, and a relaxed
knapsack bound to check how far off optimal greedy was.

**Delivery.** FastAPI on the back, MapLibre and deck.gl on the front, a Claude tool use
agent wired to read only the artifacts, and a PDF generator for the plan. The demo build
runs entirely off a committed cache so it works with no internet and cannot overwrite the
numbers being judged.

## Individual contributions

We split by directory, not by feature, and we froze the JSON contracts between directories
about an hour into the build. After that nobody had to wait on anybody. We finished with
almost no merge conflicts, which for four people on a two day build was the single best
decision we made.

- **[Name A]** owned the contracts, the NOAA ingest and the extreme value work, plus the
  portfolio optimiser. Basically everything that turns raw rain into a ranked list of sites.
- **[Name B]** owned the hazard model, the HAND surface, the exposure layer and the whole
  satellite radar backtest including the 2017 transfer test.
- **[Name C]** owned the API, the grounded assistant, the plan document generator and the
  evidence labelling that keeps observed data separate from model output.
- **[Name D]** owned the frontend, the map, the guided demo mode and the offline freeze,
  and presented.

Everyone wrote their own tests for their own artifact, and we had a verification script
that hashes the cached files so we could prove during judging that nothing had drifted.

## Challenges we ran into

The data was worse than the documentation suggested. ISD is fixed width text with several
different ways of encoding missing, and if you treat a sentinel value as a real number you
get a 9999 millimetre rain day that wrecks the entire tail fit. We lost hours to that.

Our AWS instance had a hard expiry time. We had a countdown to evacuate every artifact off
the box and make the demo run offline, which is why the whole thing now ships with a frozen
cache. Building around a deadline that kills your compute is a strange feeling.

The honest one is the flood model score. Our CSI came back at 0.053, and a dead simple
seasonal water baseline scores 0.067. We beat a naive elevation baseline by a lot but we
lose to climatology, and we had a real conversation about whether to quietly drop that
comparison. We kept it on the screen. At 200 metre resolution against speckled radar over
flooded paddy fields that is a brutally strict test, and we would rather show a real 0.053
than a fake 0.8.

One city pack tried to kill us too. When we ran the same fit for Kathmandu the return
period came out at 2.27 billion years, which is nonsense from an unstable fit on too little
data, so we null it and the interface refuses to show a number rather than inventing one.

We also found late that our own optimise endpoint rewrites four artifacts when you call it,
so a single slider drag during judging would have silently replaced the numbers we were
presenting. We locked it behind a disabled control and drove the slider off precomputed
results instead.

## Accomplishments that we're proud of

We published our own misses. The negative control that shows no shift, the replication that
only half agrees with us, and the baseline that beats our flood model are all in the demo,
labelled, not buried in an appendix. It would have been very easy to show none of that and
nobody would have caught us in two days.

The extreme value work is real. 12,066 station years, actual cleaning, actual GEV fits with
bootstrapped confidence intervals, and a result specific enough to be wrong.

We got equity into the objective function rather than the pitch deck. Low income cells carry
up to 1.5x weight in the thing that actually picks sites, which means the claim is checkable
in code.

And the whole product runs offline from a frozen cache, so the demo cannot break and cannot
quietly change the numbers under judging.

## What we learned

The hard part was never the model. It was the decision. Getting from a fitted rainfall tail
to a list of 62 places with prices on them involved more judgement calls, more assumptions
we had to label, and more arguing than any of the maths did.

We learned that honest numbers are more persuasive than good ones. Every time we showed a
judge the result that weakened our own story, the conversation got better and they trusted
the rest of it more.

We learned that freezing the interfaces between people on hour one is worth more than any
framework choice. And a few of us learned extreme value theory properly for the first time,
which turns out to be the same tail risk maths used in finance, pointed at weather instead
of a portfolio.

## What's next for RootLedger

The immediate one is turning a screening shortlist into something buildable. Right now those
62 sites are candidates, not projects. Parcel boundaries, land tenure, soil suitability,
costs, safeguards and who actually maintains the planting all need field verification with
a local partner. We would want to work with ICIMOD or a district authority in Koshi rather
than guess from orbit.

On the model side, we want to replace the HAND proxy with a proper hydrodynamic run so the
flood layer stops losing to climatology, fuse satellite rainfall so that ungauged mountain
catchments stop depending on a handful of valley stations, and wire radar scenes for the
other city packs so Bengaluru and Kathmandu get a real score instead of a null.

The bigger idea is monitoring. If you can measure restoration from satellite over time, you
can verify that carbon and that flood protection year after year, and at that point the plan
stops being a grant application and starts being an asset someone can insure or issue a bond
against. That is the version of this we actually want to build: not a report that says what
to plant, but a ledger that proves it kept working.
