import { create } from "zustand";

import { getDb } from "src/services/api";

interface SettingsState {
  currency: string;
  loaded: boolean;

  get: (key: string) => Promise<string | null>;
  load: () => Promise<void>;
  set: (key: string, value: string) => Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  currency: "USD",
  loaded: false,

  async get(key: string) {
    const d = await getDb();
    const row = await d.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = ?",
      [key]
    );
    return row?.value ?? null;
  },

  async load() {
    const currency = (await get().get("currency")) ?? "USD";
    set({ currency, loaded: true });
  },

  async set(key: string, value: string) {
    const d = await getDb();
    await d.runAsync(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      [key, value]
    );
    if (key === "currency") {
      set({ currency: value });
    }
  },
}));
