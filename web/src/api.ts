const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const USE_CACHE = import.meta.env.VITE_USE_CACHE === "true";

function cachePath(name: string): string {
  if (name === "hazard") return "/demo_cache/hazard.geojson";
  if (name === "conceptnote") return "/demo_cache/conceptnote.md";
  return `/demo_cache/${name}.json`;
}

async function fromCache(name: string) {
  const r = await fetch(cachePath(name));
  if (!r.ok) throw new Error(`cache miss ${name}`);
  if (name === "conceptnote") return r.text();
  return r.json();
}

async function fromApi(path: string, init?: RequestInit) {
  const r = await fetch(`${API}${path}`, init);
  if (!r.ok) throw new Error(`${path} ${r.status}`);
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("markdown") || ct.includes("text/plain")) return r.text();
  return r.json();
}

export async function loadJson(name: string) {
  if (!USE_CACHE) {
    try {
      return await fromApi(`/${name}`);
    } catch {
      /* fall through to committed cache */
    }
  }
  return fromCache(name);
}

export async function optimize(budget: number, mode: string) {
  if (USE_CACHE) return loadJson("plan");
  try {
    return await fromApi("/optimize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget, mode, draws: 120 }),
    });
  } catch {
    return loadJson("plan");
  }
}

export async function ask(question: string) {
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
      body: JSON.stringify({ question }),
    });
  } catch {
    return { answer: "API unreachable. I will not invent an answer.", sources: [], invented: false };
  }
}

export async function conceptNote(): Promise<string> {
  if (!USE_CACHE) {
    try {
      return (await fromApi("/conceptnote")) as string;
    } catch {
      /* cache */
    }
  }
  try {
    return (await fromCache("conceptnote")) as string;
  } catch {
    return "# Concept note unavailable\n";
  }
}
