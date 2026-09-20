import { humanize, metric, money, risk } from "./lib/format";
import { planMix } from "./lib/planSummary";
import type { Backtest, CityRow, Plan, Signal } from "./lib/types";

type Props = {
  signal: Signal | null;
  backtest: Backtest | null;
  plan: Plan | null;
  cities: CityRow[];
  busy?: boolean;
  onEnter: (city?: string) => void;
  onPlayDemo?: () => void;
};

export default function Landing({
  signal,
  backtest,
  plan,
  cities,
  busy,
  onEnter,
  onPlayDemo,
}: Props) {
  const mix = planMix(plan);
  const n = plan?.selected.length;
  const rp = signal?.headline.new_return_period_yrs;
  const typeName = mix.length === 1 ? humanize(mix[0].type) : "nature-based";

  return (
    <div className="landing">
      <div className="landing-veil" />
      <div className="landing-copy">
        <div className="landing-top">
          <p className="landing-brand">RootLedger</p>
          <p className="landing-kicker">Koshi · Nepal</p>
          <span className="landing-pack">{busy && !plan ? "Loading pack" : "Frozen evidence pack"}</span>
        </div>
        <h1 className="landing-headline">
          {n == null ? (
            "Loading the plan…"
          ) : (
            <>
              Plant <em>{metric(n, 0)}</em> sites.
              <br />
              Next flood, smaller.
            </>
          )}
        </h1>
        <p className="landing-lede">
          {n == null
            ? "Loading the cached Koshi planting plan."
            : `Everyone else builds the warning. We built the plan: ${typeName} defenses ranked like a portfolio — people-risk, carbon, and local income per dollar.`}
        </p>

        <div className="landing-stats">
          <div className="landing-stat">
            <b>{metric(n, 0)}</b>
            <span>sites to plant</span>
          </div>
          <div className="landing-stat">
            <b>{plan ? money(plan.totals.cost_usd) : "—"}</b>
            <span>modeled spend</span>
          </div>
          <div className="landing-stat">
            <b>{plan ? risk(plan.totals.people_protected) : "—"}</b>
            <span>people-risk / yr</span>
          </div>
        </div>

        <ol className="landing-steps">
          <li>
            <span>01 Rain</span>
            <b>{rp == null ? "—" : `${metric(rp, 2)}-yr storm`}</b>
            <small>used to be a 100-year rain</small>
          </li>
          <li>
            <span>02 Radar</span>
            <b>
              {backtest?.critical_success_index == null
                ? "CSI unavailable"
                : `CSI ${metric(backtest.critical_success_index, 3)}`}
            </b>
            <small>in-sample · miss vs JRC reported</small>
          </li>
          <li>
            <span>03 Plant</span>
            <b>{n == null ? "—" : `${metric(n, 0)} sites`}</b>
            <small>{plan ? `${money(plan.budget_usd)} screening budget` : "budget loading"}</small>
          </li>
        </ol>

        <div className="landing-cta">
          {onPlayDemo && (
            <button
              className="cta-primary"
              data-demo="play"
              onClick={onPlayDemo}
              disabled={!plan}
            >
              Play 90-second demo
            </button>
          )}
          <button className={onPlayDemo ? "cta-ghost" : "cta-primary"} onClick={() => onEnter("koshi")}>
            See the plan
          </button>
          <div className="city-chips" aria-label="Other city packs">
            {cities
              .filter((row) => row.id !== "koshi")
              .map((row) => (
                <button key={row.id} className="cta-ghost" onClick={() => onEnter(row.id)}>
                  {row.name.split(" (")[0]}
                </button>
              ))}
          </div>
        </div>
        <p className="landing-keys">
          Keyboard: <kbd>D</kbd> demo · <kbd>1</kbd>–<kbd>6</kbd> chapters · <kbd>Esc</kbd> landing
        </p>
      </div>
      {backtest?.event_date && (
        <p className="landing-credit">
          {backtest.event_date} · UNOSAT Sentinel-1 · dots are selected sites
        </p>
      )}
    </div>
  );
}
