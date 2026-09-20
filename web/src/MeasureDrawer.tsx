import { MessageSquare } from "lucide-react";
import { typeColor, typeLabel } from "./colors";
import { useDash } from "./context";
import { metric, money, risk } from "./format";
import { Accordion, Badge, Drawer } from "./ui";
import type { SuitabilityEvidence } from "./types";

const fraction = (v: number | null | undefined) =>
  v == null ? null : `${metric(v * 100, 0)}% of the cell`;

/**
 * The screening evidence the optimiser actually scored this site on. Rows with no value are
 * dropped rather than shown as zero, and each carries its own data_status where the pipeline
 * recorded one.
 */
function Evidence({ e }: { e: SuitabilityEvidence }) {
  const rows: { label: string; value: string; status?: string }[] = [];
  const push = (label: string, value: string | null, status?: string) => {
    if (value) rows.push({ label, value, status });
  };
  push("Water seen here by radar", fraction(e.observed_flood_fraction));
  push("Water our model puts here", fraction(e.modeled_flood_fraction), e.flood_depth_data_status);
  push(
    "Depth in a 1-in-100-year flood",
    e.flood_depth_rp100_m == null ? null : `${metric(e.flood_depth_rp100_m, 2)} m`
  );
  push("Depth if the glacial lake bursts", e.glof_depth_m ? `${metric(e.glof_depth_m, 2)} m` : null);
  push(
    "People in this cell",
    e.cell_population == null ? null : metric(e.cell_population, 0),
    e.population_data_status
  );
  push(
    "Yearly risk to people here",
    e.eal_people == null ? null : `${risk(e.eal_people)} risk points`
  );
  push("Yearly damage here", e.eal_usd == null ? null : money(e.eal_usd));
  push("Land cover", e.landcover || null, e.landcover_data_status);
  if (!rows.length) return null;

  return (
    <Accordion title="The evidence this site was scored on">
      <dl className="facts tight">
        {rows.map((row) => (
          <div key={row.label}>
            <dt>{row.label}</dt>
            <dd>
              {row.value}
              {row.status && row.status !== "observed" && <small className="src"> · {row.status}</small>}
            </dd>
          </div>
        ))}
      </dl>
      {e.critical_assets?.length ? (
        <p className="muted-p">
          Nearby: {e.critical_assets.slice(0, 6).join(", ")}
          {e.critical_assets.length > 6 ? ` and ${e.critical_assets.length - 6} more` : ""}.
        </p>
      ) : null}
    </Accordion>
  );
}

/** Slide-over with everything known about one candidate / selected site. */
export default function MeasureDrawer() {
  const d = useDash();
  const { measureDetails: m, pickedRow, candidates, picked } = d;
  const meta = candidates.find((c) => c.parcel_id === picked);
  const selected = Boolean(pickedRow);

  return (
    <Drawer
      open={d.drawerOpen && Boolean(m)}
      onClose={d.closeDrawer}
      eyebrow={selected ? "Selected preventive measure" : "Candidate intervention site"}
      title={m?.id ?? "Measure"}
      footer={
        <button
          className="btn primary"
          onClick={() => {
            d.closeDrawer();
            d.go("ask");
          }}
        >
          <MessageSquare size={16} /> Ask about this measure
        </button>
      }
    >
      {m && (
        <>
          {meta && (
            <div className="drawer-tags">
              <span className="tag">
                <i style={{ background: typeColor(meta.type) }} />
                {typeLabel(meta.type)}
              </span>
              <span className="tag">{metric(meta.area_ha, 2)} ha</span>
              <Badge tone={selected ? "accent" : "neutral"}>{selected ? "In plan" : "Not selected"}</Badge>
            </div>
          )}

          <div className="mini-stats">
            <div>
              <span>Cost</span>
              <b>{m.cost}</b>
            </div>
            {pickedRow && (
              <>
                <div>
                  <span>Risk cut / yr</span>
                  <b>{risk(pickedRow.avoided_eal_people)}</b>
                </div>
                <div>
                  <span>tCO₂ / 10 yr</span>
                  <b>{metric(pickedRow.co2_t_10yr, 0)}</b>
                </div>
                <div>
                  <span>Income / yr</span>
                  <b>{money(pickedRow.income_usd_yr)}</b>
                </div>
              </>
            )}
          </div>

          {d.equityLine && <p className="equity">{d.equityLine}</p>}

          <dl className="facts">
            <div>
              <dt>What</dt>
              <dd>{m.what}</dd>
            </div>
            <div>
              <dt>Why here</dt>
              <dd>{m.why}</dd>
            </div>
            <div>
              <dt>Modeled benefit</dt>
              <dd>{m.benefit}</dd>
            </div>
            <div>
              <dt>Assumption</dt>
              <dd>{m.assumption}</dd>
            </div>
            <div>
              <dt>Verification</dt>
              <dd>{m.verification}</dd>
            </div>
          </dl>

          {meta?.suitability_evidence && <Evidence e={meta.suitability_evidence} />}
        </>
      )}
    </Drawer>
  );
}
