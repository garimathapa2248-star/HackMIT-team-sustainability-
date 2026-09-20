import { useState } from "react";
import { ClipboardCheck, FileText, Home, Landmark, Users } from "lucide-react";
import { pdfUrl } from "../api";
import Markdown from "../Markdown";
import { typeLabel } from "../colors";
import { useDash } from "../context";
import { metric, money, risk } from "../format";
import type { AttributionLever, CatalogRow } from "../types";
import { Accordion, Callout, Card, Segmented } from "../ui";

/** Roles are planning leads, never blame. The API nulls every percentage on purpose. */
const ROLES = [
  {
    key: "government" as const,
    label: "Government",
    icon: <Landmark size={16} />,
    blurb: "Works only a public authority can approve: land, zoning, drainage, river works.",
  },
  {
    key: "community" as const,
    label: "Community",
    icon: <Users size={16} />,
    blurb: "Shared land planted and maintained collectively.",
  },
  {
    key: "household" as const,
    label: "Household",
    icon: <Home size={16} />,
    blurb: "Work a family can do on its own slope or plot.",
  },
];

function Lever({ lever }: { lever: AttributionLever }) {
  return (
    <li className="lever">
      <b>{typeLabel(lever.lever)}</b>
      <dl className="lever-facts">
        <div>
          <dt>Modelled spend</dt>
          <dd>
            {lever.plan_spend_usd == null ? (
              <span className="na">no modelled budget line</span>
            ) : (
              money(lever.plan_spend_usd)
            )}
          </dd>
        </div>
        <div>
          <dt>People-risk avoided / yr</dt>
          <dd>
            {lever.annual_expected_people_risk_avoided == null ? (
              <span className="na">not quantified</span>
            ) : (
              risk(lever.annual_expected_people_risk_avoided)
            )}
          </dd>
        </div>
        {lever.risk_driver && (
          <div>
            <dt>Driver</dt>
            <dd>{lever.risk_driver}</dd>
          </div>
        )}
      </dl>
      {lever.source && <p className="lever-source">{lever.source}</p>}
    </li>
  );
}

function Roles() {
  const { attribution, cityName } = useDash();
  if (!attribution) {
    return (
      <Card title="Delivery roles">
        <p className="muted-p">The API did not return a role map for {cityName}.</p>
      </Card>
    );
  }
  const byRole = {
    government: attribution.government_levers || [],
    community: attribution.community_levers || [],
    household: attribution.household_levers || [],
  };
  return (
    <>
      <div className="role-grid">
        {ROLES.map((role) => {
          const levers = byRole[role.key];
          return (
            <section className="role-col" key={role.key}>
              <header className="role-head">
                <span className="role-icon">{role.icon}</span>
                <div>
                  <b>{role.label}</b>
                  <small>{role.blurb}</small>
                </div>
              </header>
              {levers.length ? (
                <ul className="lever-list">
                  {levers.map((lever) => (
                    <Lever key={lever.lever} lever={lever} />
                  ))}
                </ul>
              ) : (
                <p className="role-empty">
                  No measure of this kind was selected under this budget.
                </p>
              )}
            </section>
          );
        })}
      </div>
      <Callout title="No responsibility split.">
        This page maps work to whoever would normally lead it. It does not say who caused the flood
        risk, and the API returns no percentages{" "}
        {attribution.quantified_responsibility_split_available === false && (
          <>
            (<code>quantified_responsibility_split_available: false</code>)
          </>
        )}
        . {attribution.provenance?.api_note}
      </Callout>
    </>
  );
}

/** Measure types the optimiser can buy but did not choose under this budget. */
function Catalog() {
  const { plan, isKoshi } = useDash();
  const catalog = plan?.measure_catalog;
  if (!isKoshi || !catalog?.length) return null;
  const unpicked = catalog.filter((row) => !row.n_selected);
  if (!unpicked.length) return null;
  const inEngine = unpicked.filter((row) => !row.out_of_catalog);
  const outOf = unpicked.filter((row) => row.out_of_catalog);

  const row = (item: CatalogRow) => (
    <tr key={item.type}>
      <td>{typeLabel(item.type)}</td>
      <td className="num">{item.cost_per_ha == null ? "—" : `${money(item.cost_per_ha)}/ha`}</td>
      <td className="num">{item.lifetime_yr == null ? "—" : `${item.lifetime_yr} yr`}</td>
      <td className="num">
        {item.eal_reduction_frac == null ? "—" : `${metric(item.eal_reduction_frac * 100, 0)}%`}
      </td>
      <td>{item.primary_hazard || "—"}</td>
    </tr>
  );

  return (
    <Card
      title="Available in the engine, not in this budget"
      subtitle="Real costs and effects from the optimiser's own catalogue — these types simply lost the ranking here."
    >
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Measure</th>
              <th>Cost</th>
              <th>Lifetime</th>
              <th>Assumed risk cut</th>
              <th>Hazard</th>
            </tr>
          </thead>
          <tbody>{inEngine.map(row)}</tbody>
        </table>
      </div>
      {outOf.map((item) => (
        <Callout key={item.type} title={`${typeLabel(item.type)}: out of catalogue.`}>
          {item.note}
        </Callout>
      ))}
      {inEngine[0]?.source && <p className="fine">{inEngine[0].source}</p>}
    </Card>
  );
}

/** The verification strings the optimiser attached to its own picks. */
function ResidentChecks() {
  const { plan, candidates } = useDash();
  const ids = new Set((plan?.selected || []).map((s) => s.parcel_id));
  const checks = new Set<string>();
  for (const site of candidates) {
    if (!ids.has(site.parcel_id)) continue;
    const raw = site.required_verification || site.verification;
    for (const line of Array.isArray(raw) ? raw : raw ? [raw] : []) checks.add(line);
  }
  const list = [...checks];
  if (!list.length) return null;
  return (
    <Card
      title="What to check before anyone digs"
      subtitle="Carried on the selected sites themselves — these are the engine's own conditions, not our advice."
    >
      <ul className="checklist">
        {list.map((line) => (
          <li key={line}>
            <ClipboardCheck size={15} />
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p className="fine">
        A site's map dot is the centre of a model cell, not a surveyed plot boundary. Anyone can ask
        the district why a particular field was chosen.
      </p>
    </Card>
  );
}

function Documents() {
  const { scorecard, citizenBrief, city } = useDash();
  const [doc, setDoc] = useState<"scorecard" | "brief">("scorecard");
  const text = doc === "scorecard" ? scorecard : citizenBrief;
  return (
    <Card
      title="Two briefs, same numbers"
      subtitle="Generated by the API from the same artifacts this site reads."
      action={
        <Segmented<"scorecard" | "brief">
          label="Which brief"
          value={doc}
          onChange={setDoc}
          options={[
            { value: "scorecard", label: "For the district" },
            { value: "brief", label: "For residents" },
          ]}
        />
      }
    >
      <div className="report">
        {text ? (
          <Markdown text={text} />
        ) : (
          <p className="muted-p">The API did not return this document for this region.</p>
        )}
      </div>
      <a className="btn ghost small" href={pdfUrl(city)} target="_blank" rel="noreferrer">
        <FileText size={15} /> Full screening plan (PDF)
      </a>
    </Card>
  );
}

export default function ActorsView() {
  const { attribution, cityName, plan } = useDash();
  const govSpend = (attribution?.government_levers || []).reduce(
    (sum, lever) => sum + (lever.plan_spend_usd || 0),
    0
  );
  return (
    <div className="view">
      <section className="hero rain-hero">
        <div className="hero-copy">
          <span className="eyebrow">Who acts</span>
          <h1>
            A plan nobody owns is <em>just a map</em>
          </h1>
          <p className="hero-lede">
            Every measure in the catalogue has someone who would normally lead it. Here is who that
            is for {cityName}, what this budget actually asks of them, and what a resident can check
            for themselves.
          </p>
        </div>
        <div className="hero-stat">
          <span className="eyebrow">This budget asks the public sector for</span>
          <div className="plan-budget">{govSpend ? money(govSpend) : "—"}</div>
          <small className="plan-sub">
            {plan ? `across ${plan.selected.length} sites` : "no plan loaded"}
          </small>
          <ul className="role-mini">
            {ROLES.map((role) => {
              const n = (attribution?.[`${role.key}_levers`] || []).length;
              return (
                <li key={role.key}>
                  {role.icon}
                  <span>{role.label}</span>
                  <b>{n}</b>
                </li>
              );
            })}
          </ul>
          <small className="shift-note">
            Counts are measure types with a named lead, not organisations or people.
          </small>
        </div>
      </section>

      <div className="section-title">
        <h2>Who leads what</h2>
        <p>
          A planning assumption that needs local confirmation — not a legal assignment and not an
          allocation of blame.
        </p>
      </div>
      <Roles />

      <div className="section-title">
        <h2>What else the engine could plant</h2>
        <p>
          This budget bought one kind of site. These other options exist with real costs; they were
          simply not the best value here.
        </p>
      </div>
      <Catalog />

      <div className="section-title">
        <h2>What a resident can verify</h2>
        <p>Nothing here needs our permission to check.</p>
      </div>
      <ResidentChecks />
      <Documents />

      <Card>
        <Accordion title="How these roles were assigned">
          <ul className="plain-list">
            <li>
              <b>By measure type, not by area.</b> Each intervention type carries a provisional
              implementation lead in the engine.
            </li>
            <li>
              <b>Spend is model output.</b> A dollar figure appears only where this plan actually
              allocated money to that lever.
            </li>
            <li>
              <b>Some duties have no budget line.</b> Drainage, zoning and glacial-lake outlet works
              are listed as public responsibilities with no modelled cost, because this is a
              nature-based budget.
            </li>
          </ul>
          {attribution?.provenance?.method && (
            <p className="muted-p">{attribution.provenance.method}</p>
          )}
        </Accordion>
      </Card>
    </div>
  );
}
