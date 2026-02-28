import { create } from "zustand";

import { getDb } from "src/services/api";

interface HomeLocation {
  lat: number;
  lng: number;
  name: string;
}

interface SettingsState {
  currency: string;
  homeLocation: HomeLocation | null;
  loaded: boolean;

  get: (key: string) => Promise<string | null>;
  load: () => Promise<void>;
  set: (key: string, value: string) => Promise<void>;
  setHomeLocation: (location: HomeLocation | null) => Promise<void>;
}

export const useSettings = create<SettingsState>((set, get) => ({
  currency: "USD",
  homeLocation: null,
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
    const s = get();
    const currency = (await s.get("currency")) ?? "USD";
    const homeLoc = await s.get("homeLocation");
    set({
      currency,
      homeLocation: homeLoc ? JSON.parse(homeLoc) : null,
      loaded: true,
    });
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

  async setHomeLocation(location: HomeLocation | null) {
    const value = location ? JSON.stringify(location) : "";
    await get().set("homeLocation", value);
    set({ homeLocation: location });
  },
}));
