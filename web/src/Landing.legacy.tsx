import { humanize, metric, money, risk } from "./lib/format";
import { planMix } from "./lib/planSummary";
import type { Backtest, CityRow, Plan, Signal } from "./lib/types";

type Props = {
  signal: Signal | null;
  backtest: Backtest | null;
  plan: Plan | null;
  cities: CityRow[];
  onEnter: (city?: string) => void;
};

export default function Landing({ signal, backtest, plan, cities, onEnter }: Props) {
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
            : `A nature-based preventive plan for the Koshi floodplain — ${typeName}, not another warning.`}
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
          <button className="cta-primary" onClick={() => onEnter("koshi")}>
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
      </div>
      {backtest?.event_date && (
        <p className="landing-credit">
          {backtest.event_date} · UNOSAT Sentinel-1 · dots are selected sites
        </p>
      )}
    </div>
  );
}
