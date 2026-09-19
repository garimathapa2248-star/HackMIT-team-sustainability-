"""Demo charts for Garima: return-level curve with CI band + efficient frontier.

Writes SVG (and a self-contained HTML) so the demo does not depend on matplotlib.
Run from the repo root:

    python -m optimize.charts
    python -m optimize.charts --root . --output artifacts/charts
"""
from __future__ import annotations

import argparse
import json
from html import escape
from pathlib import Path

from .portfolio import load_inputs, optimize, resolve_input_paths


W, H = 840, 460
M = {"l": 72, "r": 28, "t": 56, "b": 56}
INK = "#e8eef7"
MUTED = "#8fa0b8"
ACCENT = "#3ee0c0"
WARN = "#f0c14b"
BAND = "rgba(62,224,192,0.22)"
GRID = "rgba(143,160,184,0.18)"
BG = "#0b1220"


def _load_json(path: Path) -> dict:
    return json.loads(path.read_text())


def _lin(v, a0, a1, b0, b1):
    if a1 == a0:
        return (b0 + b1) / 2
    t = (v - a0) / (a1 - a0)
    return b0 + t * (b1 - b0)


def _log(v, a0, a1, b0, b1):
    from math import log10
    return _lin(log10(v), log10(a0), log10(a1), b0, b1)


def _poly(points: list[tuple[float, float]]) -> str:
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in points)


def _svg_shell(title: str, subtitle: str, body: str, extra: str = "") -> str:
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="img" aria-label="{escape(title)}">
  <rect width="{W}" height="{H}" rx="14" fill="{BG}"/>
  <text x="{M['l']}" y="28" fill="{INK}" font-family="Inter, Helvetica, Arial, sans-serif" font-size="18" font-weight="700">{escape(title)}</text>
  <text x="{M['l']}" y="46" fill="{MUTED}" font-family="Inter, Helvetica, Arial, sans-serif" font-size="12">{escape(subtitle)}</text>
  {body}
  {extra}
</svg>
'''


def return_level_svg(signal: dict) -> str:
    levels = {int(k): float(v) for k, v in signal["return_levels_mm"].items()}
    cis = {int(k): [float(v[0]), float(v[1])] for k, v in signal["return_levels_ci95"].items()}
    periods = sorted(levels)
    lo = min(cis[p][0] for p in periods)
    hi = max(cis[p][1] for p in periods)
    y0, y1 = lo * 0.85, hi * 1.08
    x0, x1 = min(periods), max(periods)
    plot_l, plot_r = M["l"], W - M["r"]
    plot_t, plot_b = M["t"], H - M["b"]

    def X(p): return _log(p, x0, x1, plot_l, plot_r)
    def Y(mm): return _lin(mm, y0, y1, plot_b, plot_t)

    band = [(X(p), Y(cis[p][1])) for p in periods] + [(X(p), Y(cis[p][0])) for p in reversed(periods)]
    mean = [(X(p), Y(levels[p])) for p in periods]
    ticks_x = periods
    n_y = 5
    ticks_y = [y0 + (y1 - y0) * i / (n_y - 1) for i in range(n_y)]

    grid = []
    for p in ticks_x:
        grid.append(f'<line x1="{X(p):.1f}" y1="{plot_t}" x2="{X(p):.1f}" y2="{plot_b}" stroke="{GRID}" />')
    for mm in ticks_y:
        grid.append(f'<line x1="{plot_l}" y1="{Y(mm):.1f}" x2="{plot_r}" y2="{Y(mm):.1f}" stroke="{GRID}" />')
        grid.append(
            f'<text x="{plot_l - 10}" y="{Y(mm) + 4:.1f}" text-anchor="end" fill="{MUTED}" '
            f'font-family="Inter, Helvetica, Arial, sans-serif" font-size="11">{mm:.0f}</text>'
        )
    for p in ticks_x:
        grid.append(
            f'<text x="{X(p):.1f}" y="{plot_b + 22}" text-anchor="middle" fill="{MUTED}" '
            f'font-family="Inter, Helvetica, Arial, sans-serif" font-size="11">{p}</text>'
        )

    dots = "".join(
        f'<circle cx="{X(p):.1f}" cy="{Y(levels[p]):.1f}" r="4.2" fill="{ACCENT}"/>' for p in periods
    )
    hl = signal.get("headline") or {}
    new_rp = hl.get("new_return_period_yrs")
    old_rp = hl.get("old_return_period_yrs") or 100
    thresh = hl.get("threshold_mm")
    callout = ""
    if new_rp and thresh:
        callout = (
            f'<line x1="{plot_l}" y1="{Y(thresh):.1f}" x2="{plot_r}" y2="{Y(thresh):.1f}" '
            f'stroke="{WARN}" stroke-dasharray="5 4" stroke-width="1.4"/>'
            f'<text x="{plot_r}" y="{Y(thresh) - 8:.1f}" text-anchor="end" fill="{WARN}" '
            f'font-family="Inter, Helvetica, Arial, sans-serif" font-size="12" font-weight="600">'
            f'{old_rp:.0f}-yr depth now recurs every {float(new_rp):.2f} yr</text>'
        )
    body = f'''
  <g>{''.join(grid)}</g>
  <polygon points="{_poly(band)}" fill="{BAND}"/>
  <polyline points="{_poly(mean)}" fill="none" stroke="{ACCENT}" stroke-width="2.6"/>
  {dots}
  {callout}
  <text x="{(plot_l + plot_r) / 2:.1f}" y="{H - 14}" text-anchor="middle" fill="{MUTED}"
        font-family="Inter, Helvetica, Arial, sans-serif" font-size="12">return period (years, log)</text>
  <text x="18" y="{(plot_t + plot_b) / 2:.1f}" fill="{MUTED}" font-family="Inter, Helvetica, Arial, sans-serif"
        font-size="12" transform="rotate(-90 18 {(plot_t + plot_b) / 2:.1f})">daily rainfall (mm)</text>
'''
    n = signal.get("station_years")
    substations = signal.get("stations_processed")
    subtitle = (
        f"GEV annual maxima · bootstrap 95% CI · {substations} stations / {n} station-years"
        if substations and n else "GEV annual maxima · bootstrap 95% CI"
    )
    return _svg_shell("Return levels with 95% CI", subtitle, body)


def frontier_svg(plan: dict) -> str:
    pts = plan.get("frontier") or []
    if not pts:
        return _svg_shell("Efficient frontier", "no frontier points", "")
    xs = [float(p["budget_usd"]) for p in pts]
    ys = [float(p["people_protected"]) for p in pts]
    spent = float(plan["totals"]["cost_usd"])
    budget = float(plan["budget_usd"])
    x0, x1 = 0.0, max(xs + [budget])
    y0, y1 = 0.0, max(ys) * 1.18 or 1.0
    plot_l, plot_r = M["l"], W - M["r"]
    plot_t, plot_b = M["t"], H - M["b"]

    def X(v): return _lin(v, x0, x1, plot_l, plot_r)
    def Y(v): return _lin(v, y0, y1, plot_b, plot_t)

    grid = []
    for i in range(5):
        xb = x0 + (x1 - x0) * i / 4
        yb = y0 + (y1 - y0) * i / 4
        grid.append(f'<line x1="{X(xb):.1f}" y1="{plot_t}" x2="{X(xb):.1f}" y2="{plot_b}" stroke="{GRID}"/>')
        grid.append(f'<line x1="{plot_l}" y1="{Y(yb):.1f}" x2="{plot_r}" y2="{Y(yb):.1f}" stroke="{GRID}"/>')
        grid.append(
            f'<text x="{X(xb):.1f}" y="{plot_b + 22}" text-anchor="middle" fill="{MUTED}" '
            f'font-family="Inter, Helvetica, Arial, sans-serif" font-size="11">${xb/1e6:.2f}M</text>'
        )
        grid.append(
            f'<text x="{plot_l - 10}" y="{Y(yb) + 4:.1f}" text-anchor="end" fill="{MUTED}" '
            f'font-family="Inter, Helvetica, Arial, sans-serif" font-size="11">{yb:.1f}</text>'
        )

    line = [(X(p["budget_usd"]), Y(p["people_protected"])) for p in pts]
    dots = "".join(
        f'<circle cx="{X(p["budget_usd"]):.1f}" cy="{Y(p["people_protected"]):.1f}" r="4.2" fill="{ACCENT}"/>'
        for p in pts
    )
    sat = (
        f'<line x1="{X(spent):.1f}" y1="{plot_t}" x2="{X(spent):.1f}" y2="{plot_b}" '
        f'stroke="{WARN}" stroke-dasharray="5 4" stroke-width="1.4"/>'
        f'<text x="{min(X(spent) + 8, plot_r - 8):.1f}" y="{plot_t + 16}" fill="{WARN}" '
        f'font-family="Inter, Helvetica, Arial, sans-serif" font-size="12" font-weight="600">'
        f'saturates at ${spent:,.0f}</text>'
    )
    note = (plan.get("provenance") or {}).get("candidates_note") or ""
    extra = ""
    if note:
        extra = (
            f'<text x="{M["l"]}" y="{H - 12}" fill="{WARN}" '
            f'font-family="Inter, Helvetica, Arial, sans-serif" font-size="10">{escape(note[:140])}</text>'
        )
    n_sel = len(plan.get("selected") or [])
    body = f'''
  <g>{''.join(grid)}</g>
  <polyline points="{_poly(line)}" fill="none" stroke="{ACCENT}" stroke-width="2.6"/>
  {dots}
  {sat}
  <text x="{(plot_l + plot_r) / 2:.1f}" y="{H - 28}" text-anchor="middle" fill="{MUTED}"
        font-family="Inter, Helvetica, Arial, sans-serif" font-size="12">budget (USD)</text>
  <text x="18" y="{(plot_t + plot_b) / 2:.1f}" fill="{MUTED}" font-family="Inter, Helvetica, Arial, sans-serif"
        font-size="12" transform="rotate(-90 18 {(plot_t + plot_b) / 2:.1f})">annual expected people-risk avoided</text>
'''
    subtitle = f"{n_sel} parcels selected · mode={plan.get('mode')} · budget ${budget:,.0f}"
    return _svg_shell("Efficient frontier", subtitle, body, extra)


def demo_html(return_svg: str, frontier_svg: str, signal: dict, plan: dict) -> str:
    hl = signal.get("headline") or {}
    note = (plan.get("provenance") or {}).get("candidates_note") or ""
    return f"""<!doctype html>
<html lang="en">
<meta charset="utf-8"/>
<title>RootLedger · §9A demo charts</title>
<style>
  body {{ margin: 0; background: #070b14; color: {INK}; font-family: Inter, Helvetica, Arial, sans-serif; }}
  main {{ max-width: 900px; margin: 0 auto; padding: 28px 16px 48px; }}
  h1 {{ font-size: 22px; margin: 0 0 6px; }}
  p {{ color: {MUTED}; line-height: 1.45; }}
  .card {{ margin: 22px 0; }}
  .warn {{ color: {WARN}; font-size: 13px; }}
</style>
<main>
  <h1>RootLedger · signal + plan charts</h1>
  <p>Drop these SVGs into the demo. Numbers are live from <code>artifacts/signal.json</code> and <code>artifacts/plan.json</code>.</p>
  <p><strong style="color:{ACCENT}">{escape(str(hl.get("statement") or ""))}</strong></p>
  <div class="card">{return_svg}</div>
  <div class="card">{frontier_svg}</div>
  {"<p class='warn'>" + escape(note) + "</p>" if note else ""}
</main>
</html>
"""


def render(root: Path, out_dir: Path, snapshot_dir: Path | None = None) -> dict[str, Path]:
    paths = resolve_input_paths(root)
    if not paths["signal"]:
        raise FileNotFoundError("Need artifacts/signal.json or the contract fixture.")
    signal = _load_json(paths["signal"])
    plan_path = root / "artifacts" / "plan.json"
    if plan_path.exists():
        plan = _load_json(plan_path)
    else:
        load_inputs(root)
        plan = optimize(root=root)

    rl = return_level_svg(signal)
    fr = frontier_svg(plan)
    html = demo_html(rl, fr, signal, plan)

    out_dir.mkdir(parents=True, exist_ok=True)
    written = {
        "return_levels": out_dir / "return_levels.svg",
        "frontier": out_dir / "frontier.svg",
        "html": out_dir / "demo.html",
    }
    written["return_levels"].write_text(rl)
    written["frontier"].write_text(fr)
    written["html"].write_text(html)

    if snapshot_dir is not None:
        snapshot_dir.mkdir(parents=True, exist_ok=True)
        (snapshot_dir / "return_levels.svg").write_text(rl)
        (snapshot_dir / "frontier.svg").write_text(fr)
        (snapshot_dir / "demo.html").write_text(html)
        written["snapshot"] = snapshot_dir
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description="Write return-level + frontier demo charts.")
    parser.add_argument("--root", default=".")
    parser.add_argument("--output", default="artifacts/charts")
    parser.add_argument("--snapshot", default="optimize/demo_charts",
                        help="Committed copy Garima can pull (empty string to skip).")
    args = parser.parse_args()
    root = Path(args.root)
    snap = Path(args.snapshot) if args.snapshot else None
    written = render(root, root / args.output if not Path(args.output).is_absolute() else Path(args.output), snap)
    for key, path in written.items():
        print(f"{key}: {path}")


if __name__ == "__main__":
    main()
