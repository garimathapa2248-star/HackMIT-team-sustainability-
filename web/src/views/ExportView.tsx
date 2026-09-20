import { Download, FileText } from "lucide-react";
import { pdfUrl } from "../api";
import { useDash } from "../context";
import Markdown from "../Markdown";
import { Card, PageHeader } from "../ui";

export default function ExportView() {
  const { city, note, downloadNote } = useDash();
  return (
    <div className="view narrow">
      <PageHeader
        eyebrow="Export"
        title="Take the plan with you"
        lede="Both documents are rendered by the API from the current plan, so what you download is what this site shows."
        right={
          <div className="hero-cta">
            <button className="btn primary" onClick={downloadNote} disabled={!note}>
              <Download size={16} /> Markdown
            </button>
            <a className="btn ghost" href={pdfUrl(city)} target="_blank" rel="noreferrer">
              <FileText size={16} /> PDF
            </a>
          </div>
        }
      />
      <Card title="Preview" subtitle="Screening plan">
        <div className="report">
          {note ? (
            <Markdown text={note} />
          ) : (
            <p className="muted-p">The API did not return a plan document for this region.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
