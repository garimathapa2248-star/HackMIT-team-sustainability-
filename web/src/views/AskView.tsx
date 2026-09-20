import { useRef } from "react";
import { ArrowLeftRight, CloudRain, Send, ShieldCheck, Sprout, Wallet } from "lucide-react";
import { useDash } from "../context";
import Markdown from "../Markdown";
import { Badge } from "../ui";

const LABELS = /^(What|Why|Cost|Benefit|Assumption|Verification):\s*(.*)$/;

/** Answers arrive as plain text; "What: … Why: …" lines are shown as labeled rows. */
function AnswerBody({ text }: { text: string }) {
  const lines = text.split("\n").filter((line) => line.trim());
  const labeled = lines.every((line) => LABELS.test(line));
  if (labeled && lines.length > 1) {
    return (
      <dl className="answer-rows">
        {lines.map((line) => {
          const [, label, body] = line.match(LABELS) as RegExpMatchArray;
          return (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{body}</dd>
            </div>
          );
        })}
      </dl>
    );
  }
  // The grounded model answers in markdown (tables, bold, bullets); render it as such.
  return (
    <div className="answer-text">
      <Markdown text={text} />
    </div>
  );
}

export default function AskView() {
  const d = useDash();
  const input = useRef<HTMLInputElement>(null);

  // Each example is worded so the offline answerer recognises it (and reads naturally).
  type Topic = { icon: React.ReactNode; label: string; q: string };
  const topics: Topic[] = [
    { icon: <CloudRain size={17} />, label: "The rain", q: "Why is heavy rain arriving more often?" },
    { icon: <Wallet size={17} />, label: "The plan", q: "What does the plan cost, and what does it deliver?" },
  ];
  if (d.picked) topics.push({ icon: <Sprout size={17} />, label: "One site", q: `Why was ${d.picked} selected?` });
  topics.push(
    { icon: <ShieldCheck size={17} />, label: "The flood map", q: "How well does the flood map match what flooded?" },
    { icon: <ArrowLeftRight size={17} />, label: "Before and after", q: "What would change compared with before the plan?" }
  );

  const pick = (q: string) => {
    d.setQ(q);
    document.getElementById("ask-composer")?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => input.current?.focus(), 350);
  };

  // /ask returns three shapes of `sources`: tool names it called, artifact filenames from the
  // regex fallback, or a single "openrouter:<model>" when the model answered without a tool.
  const TOOL_NAMES: Record<string, string> = {
    get_signal: "the rainfall finding",
    get_backtest: "the flood check",
    get_hazard_summary: "the risk map",
    rank_cells: "the risk map",
    explain_parcel: "the site record",
    run_optimize: "the plan",
  };
  const sources = d.answerSources
    .filter((name) => !name.startsWith("openrouter:"))
    .map((name) => TOOL_NAMES[name] || name.replace(/\.json$/, "").replace(/_/g, " "));
  const unique = [...new Set(sources)];

  return (
    <div className="view">
      <section className="hero rain-hero ask-hero">
        <div className="hero-copy">
          <span className="eyebrow">AskSprout</span>
          <h1>
            Ask anything about the <em>plan</em>
          </h1>
          <p className="hero-lede">
            Answers come from the data on this site: the rainfall finding, the plan, the flood check and the
            before-and-after comparison. Every answer lists the files it used.
          </p>
        </div>
      </section>

      <div className="section-title">
        <h2>Ask a question</h2>
        <p>Type your own question, or pick an example further down.</p>
      </div>

      <section className="ask-panel" id="ask-composer" aria-label="Ask a question">
        <form className="ask-compose" onSubmit={d.onAsk}>
          <label htmlFor="ask-input">Your question</label>
          <div className="ask-form">
            <input
              id="ask-input"
              ref={input}
              value={d.q}
              onChange={(event) => d.setQ(event.target.value)}
              placeholder="For example: why is heavy rain arriving more often?"
            />
            <button className="btn primary big" type="submit" disabled={d.asking || !d.q.trim()}>
              <Send size={16} /> {d.asking ? "Thinking…" : "Ask"}
            </button>
          </div>
          {d.picked && (
            <p className="help small">
              Tip: to ask about a single site, name it, for example {d.picked}.
            </p>
          )}
        </form>

        <div className="answer-card" aria-live="polite">
          <div className="answer-head">
            <span className="eyebrow">Answer</span>
            {!d.asking && (d.a || d.answerMeta) && (
              <Badge tone={unique.length ? "accent" : "warn"}>
                {unique.length ? "Grounded in this site's data" : "No sources"}
              </Badge>
            )}
          </div>
          {d.asking ? (
            <div className="answer-skeleton" aria-label="Working on it">
              <span className="skeleton" />
              <span className="skeleton" />
              <span className="skeleton short" />
            </div>
          ) : d.a ? (
            <AnswerBody text={d.a} />
          ) : d.answerMeta ? (
            <p className="answer-empty">{d.answerMeta}</p>
          ) : (
            <p className="answer-empty">
              Your answer will appear here. It is written only from the data on this site, so it will not go beyond
              what is in it.
            </p>
          )}
          {!d.asking && d.a && (
            <p className="answer-source">
              {unique.length ? `Read from: ${unique.join(", ")}.` : "No sources were returned."}
              {d.answerMeta ? ` ${d.answerMeta}` : ""}
            </p>
          )}
        </div>
      </section>

      <div className="section-title">
        <h2>Not sure what to ask?</h2>
        <p>Pick an example and it fills in the question box for you.</p>
      </div>
      <ul className="topic-grid">
        {topics.map((topic) => (
          <li key={topic.label}>
            <button type="button" className="topic-card" onClick={() => pick(topic.q)}>
              <span className="topic-icon" aria-hidden>
                {topic.icon}
              </span>
              <em>{topic.label}</em>
              <span className="topic-q">{topic.q}</span>
            </button>
          </li>
        ))}
      </ul>

      <section className="why no-date" aria-labelledby="ask-how">
        <div className="why-body">
          <h2 id="ask-how">How AskSprout answers</h2>
          <p>
            It only uses numbers already on this site, and every answer names the files it came from. When the live
            service is off, it composes answers from the saved data and says so.
          </p>
        </div>
      </section>
    </div>
  );
}
