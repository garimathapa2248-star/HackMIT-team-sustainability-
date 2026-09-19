"""Command-line entry point: write artifacts/plan.json for a budget and mode."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from .counterfactual import apply as apply_counterfactual
from .portfolio import optimize


def main() -> None:
    parser = argparse.ArgumentParser(description="Build RootLedger's optimized plan artifact.")
    parser.add_argument("--budget", type=float, default=2_000_000.0)
    parser.add_argument("--mode", choices=("expected", "cvar"), default="expected")
    parser.add_argument("--root", default=".", help="Repo root holding artifacts/ and contracts/fixtures/")
    parser.add_argument("--draws", type=int, default=500)
    parser.add_argument("--output", default="artifacts/plan.json")
    args = parser.parse_args()

    plan = optimize(budget=args.budget, mode=args.mode, root=args.root, draws=args.draws)
    destination = Path(args.output)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(plan, indent=2) + "\n")
    apply_counterfactual(Path(args.root), plan)
    t = plan["totals"]
    print(f"plan.json written: {len(plan['selected'])} parcels, "
          f"${t['cost_usd']:,.0f}, {t['people_protected']:.1f} people-risk avoided, "
          f"{t['co2_t_10yr']:,.0f} tCO2, ${t['income_usd_yr']:,.0f}/yr income.")
    note = (plan.get("provenance") or {}).get("candidates_note")
    if note:
        print(note)


if __name__ == "__main__":
    main()
