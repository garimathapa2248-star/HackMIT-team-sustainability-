import type { ReactNode } from "react";
import { CHAPTERS } from "./lib/demo";
import type { Chapter } from "./lib/types";

type Props = {
  chapter: Chapter;
  onChapter: (chapter: Chapter) => void;
  headline: string;
  lede: string;
  banner?: ReactNode;
  children: ReactNode;
};

export default function ChapterDock({ chapter, onChapter, headline, lede, banner, children }: Props) {
  return (
    <aside className="chapter-dock glass">
      <nav className="chapter-nav" aria-label="Judged demo flow">
        {CHAPTERS.map((step) => (
          <button
            key={step.id}
            className={chapter === step.id ? "on" : ""}
            onClick={() => onChapter(step.id)}
            aria-keyshortcuts={step.key}
          >
            <span>{step.n}</span>
            {step.label}
          </button>
        ))}
      </nav>
      <div className="story-progress" aria-hidden="true">
        {CHAPTERS.map((step) => (
          <i key={step.id} className={chapter === step.id ? "on" : ""} />
        ))}
      </div>
      <h1>{headline}</h1>
      <p className="lede">{lede}</p>
      {banner}
      <div className="chapter-body">{children}</div>
    </aside>
  );
}
