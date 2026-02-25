import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "src/i18n/en";
import ja from "src/i18n/ja";
import ko from "src/i18n/ko";
import zh from "src/i18n/zh";
import zhHant from "src/i18n/zhHant";

const resources = {
  en: { translation: en },
  ja: { translation: ja },
  ko: { translation: ko },
  zh: { translation: zh },
  "zh-Hant": { translation: zhHant },
};

const SUPPORTED_LANGS = ["zh", "zh-Hant", "ja", "ko", "en"];

function getDeviceLanguage(): string {
  try {
    const locales = Localization.getLocales();
    const locale = locales?.[0];
    if (!locale) return "en";

    const lang = locale.languageCode ?? "";
    const script = (locale as { scriptCode?: string }).scriptCode ?? "";

    if (lang === "zh") {
      return script === "Hant" ? "zh-Hant" : "zh";
    }
    if (SUPPORTED_LANGS.includes(lang)) return lang;
    return "en";
  } catch {
    return "en";
  }
}

i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  lng: getDeviceLanguage(),
  resources,
});

export async function loadPersistedLanguage(): Promise<void> {
  try {
    const { getDb } = await import("src/services/api");
    const d = await getDb();
    const row = await d.getFirstAsync<{ value: string }>(
      "SELECT value FROM settings WHERE key = ?",
      ["language"]
    );
    if (row?.value && SUPPORTED_LANGS.includes(row.value)) {
      await i18n.changeLanguage(row.value);
    }
  } catch {}
}

export default i18n;
