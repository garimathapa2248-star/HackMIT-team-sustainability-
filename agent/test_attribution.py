from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from agent import attribution


class AttributionHonestyTests(unittest.TestCase):
    def test_build_emits_roles_without_synthetic_percentages(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            artifacts = root / "artifacts"
            artifacts.mkdir()
            (artifacts / "plan.json").write_text(json.dumps({
                "selected": [{
                    "parcel_id": "p_0001",
                    "cost_usd": 5000,
                    "avoided_eal_people": 3.5,
                }],
            }))
            (artifacts / "candidates.json").write_text(json.dumps([{
                "parcel_id": "p_0001",
                "type": "wetland_restore",
                "area_ha": 1,
                "centroid": [86.0, 27.0],
                "cell_ids": ["c_1"],
                "slope_deg": 1,
                "landcover": "wetland",
            }]))

            result = attribution.build(root)

            self.assertIsNone(result["government_pct"])
            self.assertIsNone(result["community_pct"])
            self.assertIsNone(result["household_pct"])
            self.assertFalse(result["quantified_responsibility_split_available"])
            self.assertTrue(all(
                row["risk_share_pct"] is None
                for key in ("government_levers", "community_levers", "household_levers")
                for row in result[key]
            ))
            self.assertEqual(
                result["government_levers"][0]["implementation_lead"],
                "government",
            )


if __name__ == "__main__":
    unittest.main()
