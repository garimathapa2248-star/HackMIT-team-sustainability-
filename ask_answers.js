{
  "_readme": "Offline answers for the /ask chat box. Every number below is a FIXTURE from the master plan (section 6). Replace each with the real agent output once artifacts land, then change status to REAL. Matching rule: pick the entry whose keywords appear most often in the typed question (lowercase compare); if none match, show fallback.",
  "suggested_ids": ["parcel_order", "return_period", "backtest_accuracy", "plan_impact"],
  "answers": [
    {
      "id": "parcel_order",
      "question": "Why plant parcel p_0007 before p_0031?",
      "keywords": ["p_0007", "p_0031", "parcel", "first", "before", "why"],
      "answer": "Parcel p_0007 costs $18,400 and avoids an estimated 41.2 expected exposed people, while also storing 120 tonnes of CO₂ over 10 years and generating $2,400 a year in household income. TODO: add the same figures for p_0031 and the per-dollar comparison from the real optimizer output.",
      "source": "plan.json -> selected[p_0007]; p_0031 not in fixtures",
      "status": "FIXTURE_INCOMPLETE"
    },
    {
      "id": "return_period",
      "question": "How much more often do extreme storms happen now?",
      "keywords": ["100-year", "return period", "storm", "rainfall", "recurs", "extreme", "often", "evt"],
      "answer": "The 1-in-100-year daily rainfall of the 1975–1999 era (175.6 mm) now recurs about every 34 years. The 95% confidence interval on the 100-year level is 148.2 to 209.7 mm. This is a model output from extreme-value fitting, not a forecast.",
      "source": "signal.json -> headline, return_levels_ci95",
      "status": "FIXTURE"
    },
    {
      "id": "backtest_accuracy",
      "question": "Does the model actually work?",
      "keywords": ["work", "accurate", "accuracy", "backtest", "validated", "2024", "csi", "flood", "proof"],
      "answer": "We replayed the September 27, 2024 flood against Sentinel-1 radar. The model covers 45.8 km² versus 41.2 km² observed, with a hit rate of 0.78, a false alarm ratio of 0.19, and a critical success index of 0.66. The flood-depth mapping was calibrated on this event, so this is a fit check rather than a fully independent test.",
      "source": "backtest.json",
      "status": "FIXTURE"
    },
    {
      "id": "plan_impact",
      "question": "What does the $2M plan deliver?",
      "keywords": ["plan", "deliver", "$2m", "2m", "impact", "protect", "people", "budget", "result"],
      "answer": "With a $2,000,000 budget, the plan spends $1,984,000 to protect 28,400 people, cutting exposure by 34.1%. It also stores 12,180 tonnes of CO₂ over 10 years and generates $186,000 a year in income for 412 households.",
      "source": "plan.json -> totals",
      "status": "FIXTURE"
    },
    {
      "id": "tail_risk",
      "question": "What happens in a worst-case scenario?",
      "keywords": ["tail", "worst", "cvar", "worst-case", "extreme scenario", "risk mode"],
      "answer": "In tail-risk mode, which optimizes for the worst-case scenarios instead of the average, the plan protects 21,900 people in those tail events.",
      "source": "plan.json -> cvar",
      "status": "FIXTURE"
    },
    {
      "id": "responsibility",
      "question": "Who is responsible, the government or citizens?",
      "keywords": ["responsible", "responsibility", "government", "citizens", "blame", "who"],
      "answer": "About 71% of avoidable risk sits with government, 19% with communities, and 10% with households. The biggest single government lever is drainage capacity: it accounts for 28% of the risk, and a $640,000 fix would protect 9,100 people.",
      "source": "attribution.json",
      "status": "FIXTURE"
    },
    {
      "id": "landslide",
      "question": "How do you flag landslide risk?",
      "keywords": ["landslide", "trigger", "threshold", "auc", "slope", "rain trigger"],
      "answer": "We fit a rainfall intensity–duration threshold, I = a·D^b, with a = 12.4 and b = −0.42, using 287 recorded landslide events. It scores an AUC of 0.81. It flags when rainfall conditions are landslide-prone; it is a screening tool, not a forecast.",
      "source": "signal.json -> landslide_trigger",
      "status": "FIXTURE"
    },
    {
      "id": "glacial_lake",
      "question": "Is the glacial lake growing?",
      "keywords": ["lake", "glacial", "tsho", "rolpa", "growing", "glof", "grow"],
      "answer": "Yes. Measured from satellite imagery, Tsho Rolpa grew from 1.39 km² in 1990 to 1.76 km² in 2024, an increase of 26.6%.",
      "source": "signal.json -> lake_growth",
      "status": "FIXTURE"
    },
    {
      "id": "scale",
      "question": "How much data did you process?",
      "keywords": ["data", "scale", "station", "noaa", "processed", "how much", "big"],
      "answer": "We processed 412 weather stations and 9,840 station-years of NOAA records to fit the rainfall extremes.",
      "source": "signal.json -> stations_processed, station_years",
      "status": "FIXTURE"
    }
  ],
  "fallback": "In offline mode I can only answer the questions from the demo script. Try one of the suggested questions."
}