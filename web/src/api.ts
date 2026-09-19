const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const USE_CACHE = import.meta.env.VITE_USE_CACHE === "true";

function cachePath(name: string): string {
  if (name === "hazard") return "/demo_cache/hazard.geojson";
  if (name === "flood_observed") return "/demo_cache/flood_observed.geojson";
  if (name === "flood_modeled") return "/demo_cache/flood_modeled.geojson";
  if (name === "conceptnote") return "/demo_cache/conceptnote.md";
  if (name === "scorecard") return "/demo_cache/government_scorecard.md";
  if (name === "citizenbrief") return "/demo_cache/citizen_brief.md";
  return `/demo_cache/${name}.json`;
}

async function fromCache(name: string) {
  const r = await fetch(cachePath(name));
  if (!r.ok) throw new Error(`cache miss ${name}`);
  if (name === "conceptnote" || name === "scorecard" || name === "citizenbrief") return r.text();
  return r.json();
}

async function fromApi(path: string, init?: RequestInit) {
  const r = await fetch(`${API}${path}`, init);
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("markdown") || ct.includes("text/plain")) return r.text();
  return r.json();
}

export async function loadJson(name: string, city = "koshi") {
  const q = `?city=${encodeURIComponent(city)}`;
  if (!USE_CACHE) {
    try {
      return await fromApi(`/${name}${q}`);
    } catch {
      /* fall through */
    }
  }
  if (city !== "koshi") {
    const extra = name === "hazard" || name.startsWith("flood")
      ? `/demo_cache/cities/${city}/${name === "hazard" ? "hazard.geojson" : name === "flood_observed" ? "flood_observed.geojson" : name === "flood_modeled" ? "flood_modeled.geojson" : name + ".json"}`
      : `/demo_cache/cities/${city}/${name}.json`;
    try {
      const r = await fetch(extra);
      if (r.ok) return name === "conceptnote" ? r.text() : r.json();
    } catch {
      /* */
    }
  }
  return fromCache(name);
}

export async function listCities() {
  if (!USE_CACHE) {
    try {
      return await fromApi("/cities");
    } catch {
      /* */
    }
  }
  return {
    cities: [
      { id: "koshi", name: "Koshi / Madhesh (Nepal)", ready: true },
      { id: "bangalore", name: "Bengaluru (India)", ready: true },
    ],
  };
}

export async function optimize(budget: number, mode: string, city = "koshi") {
  if (USE_CACHE) return loadJson("plan", city);
  try {
    return await fromApi("/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget, mode, draws: 120, city }),
    });
  } catch {
    return loadJson("plan", city);
  }
}

export async function ask(question: string, city = "koshi") {
  if (USE_CACHE) {
    return {
      answer: "Cache mode: start the API (`python3 -m api.main`) for live grounded answers. I will not invent numbers.",
      sources: ["demo_cache"],
      invented: false,
    };
  }
  try {
    return await fromApi("/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, city }),
    });
  } catch {
    return { answer: "API unreachable. I will not invent an answer.", sources: [], invented: false };
  }
}

export async function markdownDoc(name: "conceptnote" | "scorecard" | "citizenbrief", city = "koshi"): Promise<string> {
  const path = name === "conceptnote" ? "/conceptnote" : name === "scorecard" ? "/scorecard" : "/citizenbrief";
  if (!USE_CACHE) {
    try {
      return (await fromApi(`${path}?city=${encodeURIComponent(city)}`)) as string;
    } catch {
      /* cache */
    }
  }
  try {
    return (await fromCache(name)) as string;
  } catch {
    return `# ${name} unavailable\n`;
  }
}

export async function conceptNote(city = "koshi"): Promise<string> {
  return markdownDoc("conceptnote", city);
}
