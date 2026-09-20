// Live API only. There is no static fallback on purpose: a dead backend must look dead,
// never like a working site showing stale numbers.
// A production build talks to the Python function sitting on the same origin as the static
// files, so its base is empty. Dev servers point at the local uvicorn. An explicit
// VITE_API_URL always wins, and "" is honoured as a deliberate same-origin choice.
const RAW = import.meta.env.VITE_API_URL;
const API =
  RAW !== undefined && RAW !== null
    ? RAW
    : import.meta.env.PROD
      ? ""
      : "http://127.0.0.1:8000";

export class ApiDown extends Error {}

const url = (path: string, city?: string) =>
  city ? `${API}${path}?city=${encodeURIComponent(city)}` : `${API}${path}`;

async function req(path: string, city?: string, init?: RequestInit, timeoutMs = 20_000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(url(path, city), { ...init, signal: ctrl.signal });
  } catch {
    throw new ApiDown(`${path} unreachable`);
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) throw new ApiDown(`${path} returned ${res.status}`);
  return res;
}

/** Artifacts the API could not find come back as HTTP 200 + {error, data_status:"missing"}. */
const isMissing = (value: unknown) =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (value as { data_status?: string }).data_status === "missing";

/**
 * One JSON artifact, or null when the backend has no file for this city.
 * Throws ApiDown if the backend itself is unreachable — callers must not paper over that.
 */
export async function getJson<T = unknown>(path: string, city?: string): Promise<T | null> {
  const data = await (await req(path, city)).json();
  // /candidates returns a bare array; the data_status guard does nothing there, hence the check.
  return isMissing(data) ? null : (data as T);
}

/** Same, but a transport failure yields null instead of throwing (for optional side panels). */
export const getJsonSoft = <T = unknown>(path: string, city?: string): Promise<T | null> =>
  getJson<T>(path, city).catch(() => null);

export async function getText(path: string, city?: string): Promise<string | null> {
  try {
    return await (await req(path, city)).text();
  } catch {
    return null;
  }
}

export async function health(): Promise<boolean> {
  try {
    const data = (await (await req("/health", undefined, undefined, 6000)).json()) as { ok?: boolean };
    return data?.ok === true;
  } catch {
    return false;
  }
}

export const listCities = () => getJson<{ cities?: unknown[] }>("/cities");

/** The frozen, judged plan. Reading it never mutates anything on disk. */
export const loadPlan = <T = unknown>(city: string) => getJson<T>("/plan", city);

/**
 * A live re-solve. This OVERWRITES plan.json, backtest.counterfactual and both risk geojsons
 * on the server, so it is never called on mount — only from an explicit, confirmed control.
 */
export async function runOptimize<T = unknown>(
  budget: number,
  mode: string,
  city: string,
  draws = 120
): Promise<{ plan: T; solved: boolean }> {
  const res = await req("/optimize", undefined, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ budget, mode, draws, city }),
  }, 120_000);
  const data = (await res.json()) as T | { plan?: T; error?: string };
  // On failure the API still answers 200, wrapping the previous plan under `plan`.
  if (data && typeof data === "object" && "plan" in data && (data as { plan?: T }).plan) {
    return { plan: (data as { plan: T }).plan, solved: false };
  }
  return { plan: data as T, solved: true };
}

export type AskReply = { answer: string; sources?: string[]; invented?: boolean };

/** Grounded answer from the backend. Free OpenRouter models are slow, hence the long timeout. */
export async function ask(question: string, city: string): Promise<AskReply> {
  const res = await req("/ask", undefined, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, city }),
  }, 45_000);
  return (await res.json()) as AskReply;
}

export const markdownDoc = (
  name: "preventive-measures-plan" | "scorecard" | "citizenbrief",
  city: string
) => getText(`/${name}`, city);

export const pdfUrl = (city: string) =>
  `${API}/preventive-measures-plan.pdf?city=${encodeURIComponent(city)}`;
