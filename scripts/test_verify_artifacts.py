from __future__ import annotations

import tempfile
import unittest
from pathlib import Path

from scripts import verify_artifacts


class ArtifactVerificationTests(unittest.TestCase):
    def make_root(self) -> Path:
        root = Path(self.tempdir.name)
        (root / "artifacts").mkdir()
        (root / "contracts" / "fixtures").mkdir(parents=True)
        (root / "demo_cache").mkdir()
        (root / "web" / "public" / "demo_cache").mkdir(parents=True)
        return root

    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()

    def tearDown(self):
        self.tempdir.cleanup()

    def test_matching_noise_artifact_passes_without_mutation(self):
        root = self.make_root()
        payload = b'{"observed":"noise"}\n'
        paths = [
            root / "artifacts" / "noise.json",
            root / "demo_cache" / "noise.json",
            root / "web" / "public" / "demo_cache" / "noise.json",
        ]
        for path in paths:
            path.write_bytes(payload)
        before = {path: path.read_bytes() for path in paths}

        result = verify_artifacts.verify(root)

        after = {path: path.read_bytes() for path in paths}
        self.assertTrue(result["ok"])
        self.assertEqual(before, after)
        self.assertEqual(result["files_expected"], 1)
        self.assertTrue(all(check["status"] == "match" for check in result["checks"]))

    def test_hash_mismatch_fails_and_reports_target(self):
        root = self.make_root()
        (root / "artifacts" / "signal.json").write_text('{"value":1}\n')
        (root / "demo_cache" / "signal.json").write_text('{"value":2}\n')
        (root / "web" / "public" / "demo_cache" / "signal.json").write_text('{"value":1}\n')

        result = verify_artifacts.verify(root)

        self.assertFalse(result["ok"])
        mismatches = [
            check for check in result["checks"]
            if check["status"] == "mismatch"
        ]
        self.assertEqual(len(mismatches), 1)
        self.assertEqual(mismatches[0]["target"], "demo_cache")
        self.assertNotEqual(
            mismatches[0]["source_sha256"],
            mismatches[0]["target_sha256"],
        )


if __name__ == "__main__":
    unittest.main()
