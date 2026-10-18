import { loadSettings } from "./store";

const base = () => loadSettings().apiUrl.replace(/\/$/, "");

export const MAX_BYTES = 10 * 1024 * 1024;
export const ACCEPTED = ["image/jpeg", "image/png"];

export async function pingApi() {
  const res = await fetch(`${base()}/`);
  if (!res.ok) throw new Error("API injoignable");
  return res.json();
}

// Appelle POST /analyze et normalise la réponse du backend
export async function analyzeImage(file) {
  const body = new FormData();
  body.append("file", file);

  const start = performance.now();
  const res = await fetch(`${base()}/analyze`, { method: "POST", body });
  if (!res.ok) {
    let detail = `Erreur ${res.status}`;
    try { detail = (await res.json()).detail || detail; } catch { /* réponse non JSON */ }
    throw new Error(detail);
  }
  const d = await res.json();

  return {
    fire: Boolean(d.fire_detected),
    smoke: Boolean(d.smoke_detected),
    persons: Number(d.persons) || 0,
    priority: d.priority,
    ms: Math.round(performance.now() - start),
  };
}