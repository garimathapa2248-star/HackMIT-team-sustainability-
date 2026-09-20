import { MessageSquare } from "lucide-react";
import { typeColor, typeLabel } from "./colors";
import { useDash } from "./context";
import { metric, money, risk } from "./format";
import { Badge, Drawer } from "./ui";

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
        </>
      )}
    </Drawer>
  );
}
