const HISTORY_KEY = "fireguard.history.v2";
const SETTINGS_KEY = "fireguard.settings.v2";

const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* stockage indisponible */ }
};

export const DEFAULTS = {
  apiUrl: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000",
};

export const loadHistory = () => read(HISTORY_KEY, []);
export const saveHistory = (items) => write(HISTORY_KEY, items);
export const loadSettings = () => ({ ...DEFAULTS, ...read(SETTINGS_KEY, {}) });
export const saveSettings = (settings) => write(SETTINGS_KEY, settings);