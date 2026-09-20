import { Fragment, ReactNode } from "react";

/**
 * Small renderer for the markdown the API returns (headings, bold, lists, tables, rules).
 * Deliberately not a full parser: it only handles what agent/reports.py and conceptnote.py emit,
 * and anything it does not recognise falls through as plain text rather than being dropped.
 */

/**
 * The grounded model sometimes answers with LaTeX. We do not ship a maths typesetter, so
 * unwrap the handful of constructs it actually uses into readable plain text rather than
 * leaving "\\frac{TP}{TP + FP + FN}" on screen.
 */
const deLatex = (text: string) =>
  text
    .replace(/\\(?:text|mathrm|mathit|operatorname)\{([^{}]*)\}/g, "$1")
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "($1) / ($2)")
    .replace(/\\(?:times|cdot)\b/g, "\u00d7")
    .replace(/\\(?:leq|le)\b/g, "\u2264")
    .replace(/\\(?:geq|ge)\b/g, "\u2265")
    .replace(/\\approx\b/g, "\u2248")
    .replace(/\\,|\\!|\\;/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

/** A line that is only a display-math delimiter carries no content of its own. */
const isMathDelimiter = (line: string) => /^\\[[\]()]$/.test(line) || /^\$\$$/.test(line);

const inline = (text: string): ReactNode =>
  text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <b key={i}>{part.slice(2, -2)}</b>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
    if (/\\[a-zA-Z]+|\\[[\]()]/.test(part)) return <Fragment key={i}>{deLatex(part)}</Fragment>;
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });

const cells = (row: string) =>
  row.replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

export default function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (!list.length) return;
    out.push(
      <ul key={`ul-${key++}`}>
        {list.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>
    );
    list = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // A bare \[ or \] line wraps display maths; drop it and render the body as a formula.
    if (isMathDelimiter(trimmed)) {
      flushList();
      continue;
    }

    // Table: a header row followed by a |---|---| separator.
    if (trimmed.startsWith("|") && /^\|[\s:|-]+\|$/.test((lines[i + 1] || "").trim())) {
      flushList();
      const head = cells(trimmed);
      const body: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        body.push(cells(lines[i].trim()));
        i += 1;
      }
      i -= 1;
      out.push(
        <div className="table-wrap" key={`t-${key++}`}>
          <table className="table">
            <thead>
              <tr>
                {head.map((cell, c) => (
                  <th key={c}>{inline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>{inline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      flushList();
      out.push(<hr key={`hr-${key++}`} />);
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      flushList();
      const level = heading[1].length;
      const body = inline(heading[2]);
      out.push(
        level === 1 ? (
          <h3 key={`h-${key++}`}>{body}</h3>
        ) : level === 2 ? (
          <h4 key={`h-${key++}`}>{body}</h4>
        ) : (
          <h5 key={`h-${key++}`}>{body}</h5>
        )
      );
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(trimmed);
    if (bullet) {
      list.push(bullet[1]);
      continue;
    }

    flushList();
    // A line that is entirely maths reads better set apart than inline in a paragraph.
    if (/^\\?[\w\\{}]/.test(trimmed) && /\\(?:frac|text|mathrm)\b/.test(trimmed)) {
      out.push(
        <p className="formula" key={`f-${key++}`}>
          {deLatex(trimmed)}
        </p>
      );
      continue;
    }
    out.push(<p key={`p-${key++}`}>{inline(trimmed)}</p>);
  }
  flushList();

  return <div className="md">{out}</div>;
}
