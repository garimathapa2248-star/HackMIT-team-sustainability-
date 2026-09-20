#!/usr/bin/env python3
"""Read-only SHA-256 verification for artifact cache copies."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


SYNC_FILES = (
    "signal.json",
    "noise.json",
    "plan.json",
    "candidates.json",
    "hazard.geojson",
    "backtest.json",
    "attribution.json",
    "preventive_measures_plan.md",
    "preventive_measures_plan.pdf",
    "flood_observed.geojson",
    "flood_modeled.geojson",
    "flood_observed_2017.geojson",
    "flood_modeled_2017.geojson",
    "risk_before.geojson",
    "risk_with_plan.geojson",
    "government_scorecard.md",
    "citizen_brief.md",
    "replication.json",
    "cities.json",
    "rankings.json",
    "scenarios.json",
)
SYNC_TREES = ("charts", "cities")
TARGETS = ("demo_cache", "web/public/demo_cache")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def expected_files(root: Path) -> dict[Path, Path]:
    """Map cache-relative paths to the source selected by sync_artifacts.sh."""
    artifacts = root / "artifacts"
    fixtures = root / "contracts" / "fixtures"
    expected: dict[Path, Path] = {}
    for name in SYNC_FILES:
        source = artifacts / name
        if not source.is_file():
            source = fixtures / name
        if source.is_file():
            expected[Path(name)] = source
    for tree in SYNC_TREES:
        base = artifacts / tree
        if not base.is_dir():
            continue
        for source in sorted(path for path in base.rglob("*") if path.is_file()):
            expected[Path(tree) / source.relative_to(base)] = source
    return expected


def verify(root: Path) -> dict:
    root = root.resolve()
    expected = expected_files(root)
    checks = []
    ok = True
    for relative, source in sorted(expected.items(), key=lambda item: str(item[0])):
        source_hash = sha256(source)
        for target_name in TARGETS:
            target = root / target_name / relative
            if not target.is_file():
                ok = False
                checks.append({
                    "path": str(relative),
                    "target": target_name,
                    "status": "missing",
                    "source_sha256": source_hash,
                    "target_sha256": None,
                })
                continue
            target_hash = sha256(target)
            status = "match" if target_hash == source_hash else "mismatch"
            ok = ok and status == "match"
            checks.append({
                "path": str(relative),
                "target": target_name,
                "status": status,
                "source_sha256": source_hash,
                "target_sha256": target_hash,
            })
    return {
        "ok": ok,
        "algorithm": "sha256",
        "source_root": str(root / "artifacts"),
        "files_expected": len(expected),
        "copies_checked": len(checks),
        "checks": checks,
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Verify artifact/demo-cache consistency with SHA-256. "
            "This command never creates, edits, or removes files."
        )
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="repository root (default: parent of scripts/)",
    )
    parser.add_argument("--json", action="store_true", help="print the complete JSON result")
    args = parser.parse_args()

    result = verify(args.root)
    if args.json:
        print(json.dumps(result, indent=2))
    else:
        failures = [check for check in result["checks"] if check["status"] != "match"]
        print(
            f"artifact verification: {result['copies_checked']} copies checked, "
            f"{len(failures)} inconsistent"
        )
        for check in failures:
            print(f"{check['status']}: {check['target']}/{check['path']}")
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
