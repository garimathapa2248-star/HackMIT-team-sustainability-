from __future__ import annotations

import unittest
from unittest.mock import patch

from api import ask, conceptnote
from agent import reports


class ReportingHonestyTests(unittest.TestCase):
    def setUp(self):
        self.data = {
            "signal": {
                "region": "test_watershed",
                "stations_processed": 10,
                "station_years": 200,
                "headline": {
                    "statement": "Test fitted recurrence",
                    "new_return_period_yrs": 8,
                },
                "trend": {"slope_mm_per_decade": 1.25},
                "landslide_trigger": {"presentation": "rainfall classifier", "auc": 0.8},
                "provenance": {"data_status": "model output"},
            },
            "plan": {
                "budget_usd": 100_000,
                "mode": "expected",
                "selected": [{
                    "parcel_id": "p_c_00001_wetland_restore",
                    "cost_usd": 10_000,
                    "avoided_eal_people": 12.5,
                    "co2_t_10yr": 30,
                    "income_usd_yr": 400,
                }],
                "totals": {
                    "cost_usd": 10_000,
                    "people_protected": 12.5,
                    "co2_t_10yr": 30,
                    "income_usd_yr": 400,
                    "households_benefiting": 999_999,
                },
                "provenance": {
                    "data_status": "model output",
                    "factors": [{
                        "type": "wetland_restore",
                        "primary_hazard": "flood",
                        "cost_per_ha": 1000,
                        "eal_reduction_frac": 0.2,
                        "co2_t_per_ha_10yr": 10,
                        "income_usd_per_ha_yr": 20,
                        "source": "Example literature",
                    }],
                },
            },
            "backtest": {
                "event_date": "2024-09-27",
                "observed_flood_km2": 5,
                "modeled_flood_km2": 7,
                "critical_success_index": 0.1,
                "hit_rate_pod": 0.2,
                "false_alarm_ratio": 0.8,
                "counterfactual": {
                    "people_exposed_baseline": 100,
                    "people_exposed_with_plan": 75,
                    "reduction_pct": 25,
                },
                "provenance": {
                    "method": (
                        "Copernicus GLO-30; local-min HAND proxy; "
                        "CSI maximised on 27 Sep 2024 scene"
                    ),
                },
            },
            "candidates": [{
                "parcel_id": "p_c_00001_wetland_restore",
                "type": "wetland_restore",
                "area_ha": 2,
                "centroid": [86.5, 27.5],
                "cell_ids": ["c_1"],
                "slope_deg": 1.2,
                "landcover": "wetland",
                "suitability_evidence": "connected floodplain",
                "risk_driver": "river flooding",
                "provenance": {"source": "field inventory"},
            }],
            "attribution": {
                "government_pct": 71,
                "community_pct": 19,
                "household_pct": 10,
                "government_levers": [{
                    "lever": "wetland_restore",
                    "owner": "government",
                    "fix_cost_usd": 10_000,
                    "people_protected": 12.5,
                    "source": "Example literature",
                }],
            },
        }

    def load(self, name):
        return self.data.get(name)

    def test_preventive_plan_has_required_sections_and_no_household_count(self):
        with patch.object(conceptnote.loader, "load", side_effect=self.load):
            document = conceptnote.render()
            pdf = conceptnote.render_pdf()
        self.assertIn("# Preventive Measures Plan", document)
        self.assertIn("27.50000, 86.50000", document)
        self.assertIn("## 5. Assumptions and evidence basis", document)
        self.assertIn("## 6. Monitoring and verification", document)
        self.assertIn("## 7. Limitations", document)
        self.assertIn("local-min HAND proxy calibrated on this event", document)
        self.assertNotIn("999,999", document)
        self.assertNotIn("Households benefiting", document)
        self.assertTrue(pdf.startswith(b"%PDF-1.4"))
        self.assertIn(b"Limitations", pdf)

    def test_ask_uses_candidate_evidence_fields(self):
        with patch.object(ask.loader, "load", side_effect=self.load):
            answer = ask.answer(
                "Why is parcel p_c_00001_wetland_restore selected?"
            )["answer"]
        self.assertIn("connected floodplain", answer)
        self.assertIn("river flooding", answer)
        self.assertIn("field inventory", answer)
        self.assertIn("27.5, 86.5", answer)

    def test_ask_suppresses_unsupported_household_and_attribution_claims(self):
        with patch.object(ask.loader, "load", side_effect=self.load):
            budget = ask.answer("What is the budget and income?")["answer"]
            responsibility = ask.answer("Who is responsible?")["answer"]
        self.assertNotIn("999,999", budget)
        self.assertIn("do not support a households-reached claim", budget)
        self.assertNotIn("71%", responsibility)
        self.assertIn("none are reported", responsibility)

    def test_delivery_briefs_ignore_legacy_synthetic_percentages(self):
        with patch.object(reports.loader, "load", side_effect=self.load):
            scorecard = reports.government_scorecard()
            local_brief = reports.citizen_brief()
        self.assertNotIn("71%", scorecard)
        self.assertNotIn("999,999", local_brief)
        self.assertIn("No causal responsibility percentages", scorecard)


if __name__ == "__main__":
    unittest.main()
