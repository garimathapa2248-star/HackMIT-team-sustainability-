import { useEffect, useState } from "react";
import { conceptNote, markdownDoc, planPdfUrl } from "../api";
import { LoadingBlock } from "../EmptyState";
import { metric, money, risk } from "../lib/format";

type Props = {
  city: string;
  live: boolean;
  sites?: number;
  spend?: number;
  peopleRisk?: number;
  carbon?: number;
};

export default function ExportChapter({ city, live, sites, spend, peopleRisk, carbon }: Props) {
  const [note, setNote] = useState("");
  const [scorecard, setScorecard] = useState("");
  const [brief, setBrief] = useState("");
  const [doc, setDoc] = useState<"plan" | "scorecard" | "brief">("plan");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      conceptNote(city).then((text) => {
        if (!cancelled) setNote(text);
      }).catch(() => {
        if (!cancelled) setNote("# prevention plan unavailable\n");
      }),
      markdownDoc("scorecard", city).then((text) => {
        if (!cancelled) setScorecard(text);
      }).catch(() => {
        if (!cancelled) setScorecard("# scorecard unavailable\n");
      }),
      markdownDoc("citizenbrief", city).then((text) => {
        if (!cancelled) setBrief(text);
      }).catch(() => {
        if (!cancelled) setBrief("# citizen brief unavailable\n");
      }),
    ]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [city]);

  function download(filename: string, text: string) {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const body = doc === "plan" ? note : doc === "scorecard" ? scorecard : brief;

  return (
    <>
      <div className="export-brief">
        <p className="export-kicker">Funder hand-off</p>
        <b>Screening prevention plan — Koshi floodplain portfolio</b>
        <div className="export-metrics">
          <span>
            <strong>{sites == null ? "—" : metric(sites, 0)}</strong> sites
          </span>
          <span>
            <strong>{spend == null ? "—" : money(spend)}</strong> spend
          </span>
          <span>
            <strong>{peopleRisk == null ? "—" : risk(peopleRisk)}</strong> people-risk / yr
          </span>
          <span>
            <strong>{carbon == null ? "—" : metric(carbon, 0)}</strong> tCO₂ / 10 yr
          </span>
        </div>
        <small>Not unique lives saved. CSI miss vs JRC is in the scorecard. Literature factors for carbon and income.</small>
      </div>
      <div className="export-actions">
        <button className="dl" onClick={() => download("rootledger-prevention-plan.md", note)} disabled={!note || loading}>
          Download prevention plan
        </button>
        <a className="dl" href={planPdfUrl(city, live)} download>
          {live ? "Download live PDF" : "Download cached PDF"}
        </a>
      </div>
      <p className="detail">
        {live
          ? "Markdown and PDF are served from the running API (`/preventive-measures-plan`, `/scorecard`, `/citizenbrief`)."
          : "The PDF and markdown are served from the local demo cache, so the hand-off still works without the API or network."}
      </p>
      <div className="segmented" role="tablist" aria-label="Export document">
        <button className={doc === "plan" ? "on" : ""} onClick={() => setDoc("plan")}>
          Plan
        </button>
        <button className={doc === "scorecard" ? "on" : ""} onClick={() => setDoc("scorecard")}>
          Scorecard
        </button>
        <button className={doc === "brief" ? "on" : ""} onClick={() => setDoc("brief")}>
          Citizen brief
        </button>
      </div>
      <pre className="report">{loading ? "" : body}</pre>
      {loading && <LoadingBlock label="Loading the screening documents…" />}
    </>
  );
}
