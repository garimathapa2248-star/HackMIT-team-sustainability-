from __future__ import annotations

import ast
import inspect
import json
import unittest

from hazard import proof
from optimize.economics import validate_candidates


def _cell(
    cell_id: str,
    *,
    landcover: str,
    flooded: float = 0.0,
    depth100: float = 0.05,
    glof_depth: float = 0.0,
    landslide: float = 0.05,
    slope: float = 2.0,
) -> dict:
    number = int(cell_id.split("_")[-1])
    west = 86.0 + number * 0.1
    east = west + 0.08
    south, north = 26.3, 26.38
    return {
        "type": "Feature",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [west, south],
                [east, south],
                [east, north],
                [west, north],
                [west, south],
            ]],
        },
        "properties": {
            "cell_id": cell_id,
            "flood_depth_m": {"rp10": round(depth100 * 0.35, 2), "rp100": depth100},
            "glof_depth_m": glof_depth,
            "landslide_prob": landslide,
            "population": 1200 + number,
            "critical_assets": ["school"] if number == 1 else [],
            "eal_people": 4.25,
            "eal_usd": 10625.0,
            "observed_flood_frac": max(0.0, flooded - 0.1),
            "modeled_flood_frac": flooded,
            "slope_deg": slope,
            "landcover": landcover,
        },
    }


class CandidateGenerationTest(unittest.TestCase):
    def setUp(self) -> None:
        self.features = [
            _cell("c_00002", landcover="cropland", landslide=0.45, slope=22.0),
            _cell("c_00001", landcover="wetland", flooded=0.60, depth100=2.0),
            _cell("c_00003", landcover="built", flooded=0.80, depth100=2.7),
            _cell("c_00004", landcover="water", flooded=0.45, depth100=1.5),
            _cell("c_00005", landcover="unknown", flooded=0.40, depth100=1.3),
        ]

    def test_generation_is_deterministic_and_order_independent(self) -> None:
        first = proof._candidates(self.features)
        repeated = proof._candidates(list(reversed(self.features)))

        self.assertEqual(first, repeated)
        self.assertEqual(
            json.dumps(first, sort_keys=True, separators=(",", ":")),
            json.dumps(repeated, sort_keys=True, separators=(",", ":")),
        )
        self.assertEqual(
            [candidate["type"] for candidate in first],
            ["wetland_restore", "vetiver_slope", "riverbank_bio", "floodplain_restore"],
        )
        self.assertEqual(len({candidate["parcel_id"] for candidate in first}), len(first))
        self.assertNotIn("c_00003", {cell for candidate in first for cell in candidate["cell_ids"]})

    def test_candidates_emit_optimizer_and_explanation_fields(self) -> None:
        required = {
            "parcel_id",
            "type",
            "intervention_type",
            "area_ha",
            "centroid",
            "geometry",
            "cell_ids",
            "slope_deg",
            "landcover",
            "triggering_hazard",
            "risk_driver",
            "suitability_score",
            "suitability_evidence",
            "rationale",
            "exposed_population",
            "exposed_assets",
            "data_status",
            "assumptions",
            "provenance",
            "verification",
            "required_verification",
        }
        candidates = proof._candidates(self.features)
        validate_candidates(candidates)
        for candidate in candidates:
            self.assertTrue(required.issubset(candidate), candidate["parcel_id"])
            self.assertIn(candidate["type"], proof.SCREENING_AREA_HA)
            self.assertEqual(candidate["type"], candidate["intervention_type"])
            self.assertEqual(candidate["area_ha"], proof.SCREENING_AREA_HA[candidate["type"]])
            self.assertEqual(candidate["verification"], candidate["required_verification"])
            self.assertTrue(candidate["verification"])
            self.assertEqual(candidate["provenance"]["method"], proof.CANDIDATE_RULE_VERSION)

    def test_historic_observed_flood_can_trigger_prevention_screen(self) -> None:
        feature = _cell("c_00006", landcover="cropland", flooded=0.0, depth100=0.05)
        feature["properties"]["observed_flood_frac"] = 0.12
        candidates = proof._candidates([feature])
        self.assertEqual(len(candidates), 1)
        self.assertEqual(candidates[0]["type"], "floodplain_restore")
        self.assertEqual(
            candidates[0]["suitability_evidence"]["observed_flood_fraction"], 0.12
        )

    def test_candidate_rules_make_no_random_calls(self) -> None:
        functions = (
            proof._grid_features,
            proof._flood_candidate_rule,
            proof._landslide_candidate_rule,
            proof._candidates,
        )
        forbidden_calls = {"choice", "choices", "randint", "random", "uniform"}
        for function in functions:
            tree = ast.parse(inspect.getsource(function))
            calls = {
                node.func.attr
                for node in ast.walk(tree)
                if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)
            }
            calls.update(
                node.func.id
                for node in ast.walk(tree)
                if isinstance(node, ast.Call) and isinstance(node.func, ast.Name)
            )
            self.assertTrue(forbidden_calls.isdisjoint(calls), function.__name__)


if __name__ == "__main__":
    unittest.main()
