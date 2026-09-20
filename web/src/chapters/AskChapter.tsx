import type { FormEvent } from "react";
import { money, risk, humanize } from "../lib/format";
import type { Attribution, MeasureDetails } from "../lib/types";

type Props = {
  q: string;
  a: string;
  answerMeta: string;
  asking: boolean;
  attribution: Attribution | null;
  selected: MeasureDetails | null;
  prompts?: string[];
  onQ: (value: string) => void;
  onAsk: (event: FormEvent) => void;
  onAskPrompt?: (prompt: string) => void;
};

export default function AskChapter({
  q,
  a,
  answerMeta,
  asking,
  attribution,
  selected,
  prompts = [],
  onQ,
  onAsk,
  onAskPrompt,
}: Props) {
  const levers = [
    ...(attribution?.government_levers || []),
    ...(attribution?.community_levers || []),
    ...(attribution?.household_levers || []),
  ];
  return (
    <>
      <div className="chat">
        <div className="msg">
          {a ||
            (asking
              ? "Grounding the answer in the cached artifacts…"
              : "Ask about the rainfall tail, plan, proof/CSI, counterfactual, or click a selected measure. Offline answers are composed only from the cached artifacts.")}
        </div>
        {answerMeta && <p className="answer-meta">{answerMeta}</p>}
        {prompts.length > 0 && (
          <div className="ask-chips" role="group" aria-label="Suggested questions">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                className={q === prompt ? "on" : ""}
                onClick={() => (onAskPrompt ? onAskPrompt(prompt) : onQ(prompt))}
              >
                {prompt}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={onAsk}>
          <input
            value={q}
            onChange={(event) => onQ(event.target.value)}
            placeholder="Ask only what the artifacts can answer"
            aria-label="Question"
          />
          <button type="submit" disabled={asking || !q.trim()}>
            {asking ? "Grounding…" : "Ask"}
          </button>
        </form>
      </div>
      {selected && (
        <p className="detail">
          Selected measure <b>{selected.id}</b> — {selected.what}
        </p>
      )}
      <div className="chart-head">
        <b>Implementation leads</b>
        <span>no responsibility percentages</span>
      </div>
      {attribution?.quantified_responsibility_split_available ? (
        <p className="detail">
          Government {attribution.government_pct}% · community {attribution.community_pct}% · household{" "}
          {attribution.household_pct}%
        </p>
      ) : (
        <p className="detail">
          {attribution?.provenance?.data_status ||
            "Percent splits are unavailable. Leads are planning assumptions, not causal shares."}
        </p>
      )}
      <div className="mix">
        {levers.map((lever) => (
          <div className="mix-row" key={`${lever.lever}-${lever.implementation_lead}`} style={{ display: "block" }}>
            <b>
              {humanize(lever.lever)} · {lever.implementation_lead || lever.owner || "lead unavailable"}
            </b>
            <div className="detail">
              Spend {money(lever.plan_spend_usd)} · people-risk{" "}
              {risk(lever.annual_expected_people_risk_avoided)}. {lever.source}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
