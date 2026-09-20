import { useEffect, useState } from "react";
import { Check, Download, FileText, Loader2, TriangleAlert } from "lucide-react";
import { conceptNote } from "./api";
import { useDash } from "./context";
import { money } from "./format";
import { SAVED_BUDGET, cachedPdfUrl, siteNoun } from "./plan";
import type { OptimizationMode } from "./types";
import { Segmented } from "./ui";

const MIN = 250_000;
const MAX = 2_000_000;
const PRESETS = [500_000, 1_000_000, 1_500_000, 2_000_000];

const CONTENTS = [
  ["Decision context", "The rainfall finding and why this plan exists"],
  ["Evidence register", "Every source, labeled observed, modeled or assumed"],
  ["Prioritized sites", "Each site's location, cost and modeled benefit, in order"],
  ["Budget and outputs", "What your budget buys"],
  ["Assumptions", "The published rates behind every number"],
  ["Monitoring and verification", "What has to be checked on the ground"],
  ["Limitations", "What this plan cannot tell you"],
];

type Status = { kind: "idle" | "working" | "done" | "error"; text?: string };

/** Form at the bottom of the Plan page: choose a budget, check what is included, then export. */
export default function ExportPlanForm() {
  const d = useDash();
  const { plan, budget, mode, optimizerState, loading, city, cityName } = d;
  const sites = siteNoun(plan, d.candidates);
  const locked = optimizerState !== "live" || loading;

  const [draft, setDraft] = useState(String(Math.round(budget)));
  const [format, setFormat] = useState<"md" | "pdf">("md");
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  useEffect(() => setDraft(String(Math.round(budget))), [budget]);
  // The saved PDF only exists for the saved plan.
  const pdfOk = budget === SAVED_BUDGET && mode === "expected";
  useEffect(() => {
    if (!pdfOk && format === "pdf") setFormat("md");
  }, [pdfOk, format]);
  useEffect(() => setStatus({ kind: "idle" }), [budget, mode, format, city]);

  const commit = (raw: number) => {
    if (!Number.isFinite(raw)) {
      setDraft(String(Math.round(budget)));
      return;
    }
    const value = Math.min(MAX, Math.max(MIN, Math.round(raw / 50_000) * 50_000));
    setDraft(String(value));
    if (value !== budget) {
      d.setBudget(value);
      d.rerun(value, mode);
    }
  };

  const modeLabel = mode === "cvar" ? "Worst-case years" : "Best on average";
  const tag = `${city}-${(budget / 1e6).toFixed(2)}M`;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!plan) return;
    setStatus({ kind: "working", text: "Preparing your plan…" });
    try {
      if (format === "pdf") {
        const link = document.createElement("a");
        link.href = cachedPdfUrl(city);
        link.download = `rootledger-plan-${tag}.pdf`;
        link.click();
        setStatus({ kind: "done", text: `Downloaded ${link.download}.` });
        return;
      }
      const text = await conceptNote(city);
      // The document states the budget it was generated for; never hand over one that doesn't match the screen.
      const stated = text.match(/Budget ceiling:\s*\*\*\$([\d,]+)\*\*/);
      const statedBudget = stated ? Number(stated[1].replace(/,/g, "")) : null;
      if (statedBudget != null && Math.abs(statedBudget - plan.budget_usd) > 1) {
        setStatus({
          kind: "error",
          text: `The available document is for a ${money(statedBudget)} budget, not the ${money(
            plan.budget_usd
          )} shown here. Nothing was downloaded. Set the budget to ${money(statedBudget)}, or try again once the optimizer is live.`,
        });
        return;
      }
      const blob = new Blob([text], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rootledger-plan-${tag}.md`;
      link.click();
      URL.revokeObjectURL(url);
      setStatus({
        kind: "done",
        text: `Downloaded ${link.download}: ${plan.selected.length} ${sites}, ${money(plan.totals.cost_usd)}.`,
      });
    } catch {
      setStatus({ kind: "error", text: "Couldn't prepare the document. Nothing was downloaded. Please try again." });
    }
  }

  return (
    <section id="export-plan" className="export-section" aria-labelledby="export-title">
      <header className="section-title">
        <h2 id="export-title">Export this plan</h2>
        <p>Choose a budget, check what is included, then download a document you can share with a funder or team.</p>
      </header>

      <form className="export-form" onSubmit={onSubmit}>
        <div className="export-fields">
          <div className="form-field" role="group" aria-labelledby="f-budget">
            <div className="form-label">
              <span className="step-n">1</span>
              <label id="f-budget" htmlFor="export-budget">
                Budget
              </label>
            </div>
            <p className="help">The most you are willing to spend. The plan is recalculated for it.</p>
            <div className="money-input">
              <span aria-hidden>$</span>
              <input
                id="export-budget"
                type="number"
                inputMode="numeric"
                min={MIN}
                max={MAX}
                step={50_000}
                value={draft}
                disabled={locked}
                onChange={(event) => setDraft(event.target.value)}
                onBlur={(event) => commit(Number(event.target.value))}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    commit(Number((event.target as HTMLInputElement).value));
                  }
                }}
              />
            </div>
            <div className="chips" role="group" aria-label="Budget presets">
              {PRESETS.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={budget === value ? "on" : ""}
                  disabled={locked}
                  onClick={() => commit(value)}
                >
                  {money(value)}
                </button>
              ))}
            </div>
            <p className="help small">
              {locked
                ? optimizerState === "live"
                  ? "Recalculating…"
                  : `Offline: the budget is fixed at the saved ${money(SAVED_BUDGET)} plan.`
                : `Between ${money(MIN)} and ${money(MAX)}, in steps of $50,000.`}
            </p>
          </div>

          <div className="form-field" role="group" aria-labelledby="f-objective">
            <div className="form-label">
              <span className="step-n">2</span>
              <label id="f-objective">What to optimize for</label>
            </div>
            <p className="help">How the planner chooses between sites.</p>
            <Segmented<OptimizationMode>
              label="What to optimize for"
              value={mode}
              disabled={locked}
              onChange={(value) => d.rerun(budget, value)}
              options={[
                { value: "expected", label: "Best on average" },
                { value: "cvar", label: "Worst-case years" },
              ]}
            />
            <p className="help small">
              {mode === "cvar"
                ? "Picks sites that still work in the worst 10% of modeled climate years."
                : "Picks the sites that cut the most modeled risk in a typical year."}
            </p>
          </div>

          <div className="form-field" role="group" aria-labelledby="f-format">
            <div className="form-label">
              <span className="step-n">3</span>
              <span id="f-format" className="label-text">
                Format
              </span>
            </div>
            <p className="help">What you will download.</p>
            <div className="radio-cards">
              <label className={`radio-card ${format === "md" ? "on" : ""}`}>
                <input type="radio" name="format" value="md" checked={format === "md"} onChange={() => setFormat("md")} />
                <span className="rc-title">
                  <FileText size={15} /> Markdown (.md)
                </span>
                <span className="rc-sub">Opens in any text editor, Word or Google Docs. Matches your budget.</span>
              </label>
              <label className={`radio-card ${format === "pdf" ? "on" : ""} ${pdfOk ? "" : "off"}`}>
                <input
                  type="radio"
                  name="format"
                  value="pdf"
                  checked={format === "pdf"}
                  disabled={!pdfOk}
                  onChange={() => setFormat("pdf")}
                />
                <span className="rc-title">
                  <FileText size={15} /> PDF
                </span>
                <span className="rc-sub">
                  {pdfOk
                    ? `Ready to print. The saved ${money(SAVED_BUDGET)} plan.`
                    : `Only for the saved ${money(SAVED_BUDGET)} plan (best on average).`}
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="export-review">
          <div>
            <h3>What is in the document</h3>
            <ul className="checklist">
              {CONTENTS.map(([title, detail]) => (
                <li key={title}>
                  <Check size={15} />
                  <span>
                    <b>{title}</b> · {detail}
                  </span>
                </li>
              ))}
            </ul>
            <p className="help small">
              Marked screening-grade: not an engineering design, not a field survey, not an observed trial.
            </p>
          </div>
          <div className="export-summary" aria-label="Your export">
            <h3>Your export</h3>
            <dl>
              <div>
                <dt>Region</dt>
                <dd>{cityName}</dd>
              </div>
              <div>
                <dt>Budget</dt>
                <dd>{money(budget)}</dd>
              </div>
              <div>
                <dt>Plan</dt>
                <dd>{plan ? `${plan.selected.length} ${sites} · ${money(plan.totals.cost_usd)}` : "—"}</dd>
              </div>
              <div>
                <dt>Optimized for</dt>
                <dd>{modeLabel}</dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>{format === "md" ? "Markdown (.md)" : "PDF"}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="export-actions">
          <div className={`export-status ${status.kind}`} role="status" aria-live="polite">
            {status.kind === "working" && <Loader2 size={16} className="spin" />}
            {status.kind === "done" && <Check size={16} />}
            {status.kind === "error" && <TriangleAlert size={16} />}
            <span>{status.text || "Review your choices, then export. The file downloads straight to your device."}</span>
          </div>
          <div className="export-go">
            <button className="btn primary big" type="submit" disabled={!plan || loading || status.kind === "working"}>
              <Download size={17} /> Export plan
            </button>
            <span className="btn-note">
              {format === "md"
                ? "Downloads a Markdown file for this budget."
                : `Downloads the saved PDF of the ${money(SAVED_BUDGET)} plan.`}
            </span>
          </div>
        </div>
      </form>
    </section>
  );
}
