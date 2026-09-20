import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useState } from "react";
import App from "./App";
import VersionToggle from "./VersionToggle";
import V2App from "./v2/V2App";
import "./VersionToggle.css";
import "./v2/v2.css";

class DemoBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state = { message: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { message: error.message || "Something broke in the UI." };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("RootLedger UI error", error, info.componentStack);
  }
  render() {
    if (this.state.message) {
      return (
        <div className="empty-state" style={{ margin: 48, maxWidth: 480 }}>
          <strong>The demo hit a UI error.</strong>
          <p>{this.state.message}</p>
          <button className="cta-primary" type="button" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type Version = "v1" | "v2";
const STORAGE_KEY = "rootledger.version";

function readVersion(): Version {
  const params = new URLSearchParams(window.location.search);
  const query = (params.get("v") || params.get("version") || "").toLowerCase();
  if (query === "2" || query === "v2") return "v2";
  if (query === "1" || query === "v1") return "v1";
  const path = window.location.pathname.replace(/\/+$/, "");
  if (path.endsWith("/v2")) return "v2";
  if (path.endsWith("/v1")) return "v1";
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "v1" || stored === "v2") return stored;
  } catch {
    /* ignore */
  }
  return "v1";
}

function persistVersion(version: Version) {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {
    /* ignore */
  }
  const params = new URLSearchParams(window.location.search);
  params.set("v", version === "v2" ? "2" : "1");
  if (version === "v2") {
    params.delete("console");
    params.delete("city");
    params.delete("chapter");
    params.delete("demo");
  }
  const next = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
  window.history.replaceState({}, "", next);
}

export default function Root() {
  const [version, setVersion] = useState<Version>(readVersion);

  const onChange = useCallback((next: Version) => {
    persistVersion(next);
    setVersion(next);
  }, []);

  useEffect(() => {
    persistVersion(version);
  }, [version]);

  return (
    <>
      <VersionToggle version={version} onChange={onChange} />
      <DemoBoundary>{version === "v2" ? <V2App /> : <App />}</DemoBoundary>
    </>
  );
}
