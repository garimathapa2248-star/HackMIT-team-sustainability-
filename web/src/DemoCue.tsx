type Props = {
  beat: number;
  total: number;
  title: string;
  cue: string;
  auto: boolean;
  onPrev: () => void;
  onNext: () => void;
  onStop: () => void;
  onToggleAuto: () => void;
};

export default function DemoCue({
  beat,
  total,
  title,
  cue,
  auto,
  onPrev,
  onNext,
  onStop,
  onToggleAuto,
}: Props) {
  const last = beat >= total - 1;
  return (
    <div className="demo-cue glass" role="status" aria-live="polite" data-demo="cue">
      <div className="demo-cue-copy">
        <p className="demo-cue-kicker">
          90-second demo · {beat + 1}/{total}
        </p>
        <div className="demo-cue-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, index) => (
            <i key={index} className={index === beat ? "on" : index < beat ? "done" : ""} />
          ))}
        </div>
        <b>{title}</b>
        <p>{cue}</p>
      </div>
      <div className="demo-cue-actions">
        <button type="button" className="ghost" data-demo="back" onClick={onPrev} disabled={beat === 0}>
          Back
        </button>
        <button type="button" className="cta-primary demo-next" data-demo="next" onClick={onNext}>
          {last ? "Finish" : "Next beat"}
        </button>
        <button type="button" className="ghost" data-demo="pause" onClick={onToggleAuto}>
          {auto ? "Pause" : "Auto"}
        </button>
        <button type="button" className="ghost" data-demo="exit" onClick={onStop}>
          Exit
        </button>
      </div>
    </div>
  );
}
