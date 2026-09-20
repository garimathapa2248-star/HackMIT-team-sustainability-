import { Download, FileText } from "lucide-react";
import { useDash } from "../context";
import { Card, PageHeader } from "../ui";

export default function ExportView() {
  const { city, note, downloadNote } = useDash();
  const pdf =
    city === "koshi"
      ? "/demo_cache/preventive_measures_plan.pdf"
      : `/demo_cache/cities/${city}/preventive_measures_plan.pdf`;
  return (
    <div className="view narrow">
      <PageHeader
        eyebrow="Export"
        title="Take the plan with you"
        lede="The PDF is served from the local demo cache, so the hand-off still works without the API or network."
        right={
          <div className="hero-cta">
            <button className="btn primary" onClick={downloadNote}>
              <Download size={16} /> Markdown
            </button>
            <a className="btn ghost" href={pdf} download>
              <FileText size={16} /> Cached PDF
            </a>
          </div>
        }
      />
      <Card title="Preview" subtitle="Concept note">
        <pre className="report">{note || "Loading the concept note…"}</pre>
      </Card>
    </div>
  );
}
