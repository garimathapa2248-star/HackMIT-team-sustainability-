type Version = "v1" | "v2";

type Props = {
  version: Version;
  onChange: (version: Version) => void;
};

export default function VersionToggle({ version, onChange }: Props) {
  return (
    <div className="version-toggle" role="group" aria-label="Product version">
      <button
        type="button"
        className={version === "v1" ? "on" : ""}
        aria-pressed={version === "v1"}
        data-demo="v1"
        onClick={() => onChange("v1")}
      >
        <b>v1</b>
        <span>Koshi plan</span>
      </button>
      <button
        type="button"
        className={version === "v2" ? "on" : ""}
        aria-pressed={version === "v2"}
        data-demo="v2"
        onClick={() => onChange("v2")}
      >
        <b>v2</b>
        <span>live world</span>
      </button>
    </div>
  );
}
