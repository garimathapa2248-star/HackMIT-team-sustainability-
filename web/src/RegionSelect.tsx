import { ChevronDown } from "lucide-react";
import { useDash } from "./context";

/** The region dropdown. On Overview it sits in the hero; other pages place it in the same spot via `.region-bar`. */
export default function RegionSelect({ label }: { label?: string }) {
  const d = useDash();
  const text = label ?? (d.city === "koshi" ? "Regional finding for" : "Early screening for");
  return (
    <div className="region-row">
      <label htmlFor="region-select">{text}</label>
      <span className="region-select">
        <select id="region-select" value={d.city} onChange={(event) => d.setCity(event.target.value)}>
          {d.cities.map((row) => (
            <option key={row.id} value={row.id}>
              {row.name}
            </option>
          ))}
        </select>
        <ChevronDown size={16} aria-hidden />
      </span>
    </div>
  );
}
