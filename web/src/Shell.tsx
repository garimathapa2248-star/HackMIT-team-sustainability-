import {
  ArrowDown,
  CloudRain,
  Database,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  Sprout,
  Users,
} from "lucide-react";
import people from "./assets/people.json";
import BrandIcon from "./BrandIcon";
import { useDash } from "./context";
import StillIcon from "./StillIcon";
import type { View } from "./types";

const LINKS: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutDashboard size={15} /> },
  { id: "noise", label: "Data", icon: <Database size={15} /> },
  { id: "signal", label: "Rainfall", icon: <CloudRain size={15} /> },
  { id: "plan", label: "Plan", icon: <Sprout size={15} /> },
  { id: "proof", label: "Proof", icon: <ShieldCheck size={15} /> },
  { id: "actors", label: "Who acts", icon: <Users size={15} /> },
];

// The community hub is a separate page served by the API (api/static/community at /hub). Same base rule as api.ts:
// production is same-origin, dev points at the local uvicorn. We pass our own address so the hub's "Overview"
// button can bring people back here.
const RAW_API = import.meta.env.VITE_API_URL;
const API_BASE = RAW_API !== undefined && RAW_API !== null ? RAW_API : import.meta.env.PROD ? "" : "http://127.0.0.1:8000";
const HUB_URL = `${API_BASE}/hub/?from=${encodeURIComponent(window.location.origin)}`;

export function Nav() {
  const d = useDash();
  return (
    <header className="nav">
      <div className="nav-inner">
        <button className="brand" onClick={() => d.go("overview")} aria-label="RootLedger home">
          <BrandIcon />
          RootLedger
        </button>

        <nav className="nav-links" aria-label="Sections">
          {LINKS.map((link) => (
            <button
              key={link.id}
              className={d.view === link.id ? "on" : ""}
              aria-current={d.view === link.id ? "page" : undefined}
              onClick={() => d.go(link.id)}
            >
              {link.icon}
              {link.label}
            </button>
          ))}
        </nav>

        <div className="nav-right">
          <button
            className={`btn ghost small ${d.view === "ask" ? "on" : ""}`}
            onClick={() => d.go("ask")}
          >
            <MessageSquare size={15} /> <span className="keep">AskSprout</span>
          </button>
          <a className="btn brown small" href={HUB_URL} title="Open the community hub">
            <StillIcon data={people} className="nav-icon" /> <span className="keep">Branch</span>
          </a>
          {/* Export: only on the Plan page, where it jumps to the export form at the bottom. */}
          {d.view === "plan" && (
            <button
              className="btn primary small"
              aria-label="Export plan: jump to the export form at the bottom of this page"
              title="Jump to the export form at the bottom of this page"
              onClick={() => document.getElementById("export-plan")?.scrollIntoView({ behavior: "smooth" })}
            >
              <span className="keep">Export plan</span> <ArrowDown size={15} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div>
        <b>RootLedger</b>
        <p>Nature-based flood and landslide prevention, costed and checked.</p>
      </div>
      <p>
        Built for HackMIT · Team Sustainability. An early-stage analysis using open data: NOAA
        weather stations, ERA5 climate data, public terrain and map data, satellite flood images
        and JRC surface-water maps. Modeled impacts are estimates, not observed outcomes.
      </p>
    </footer>
  );
}
