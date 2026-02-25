import { Alert } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import * as api from "src/services/api";

type TFunc = (key: string) => string;

async function shareAndCleanup(file: File, mimeType: string, UTI: string, t?: TFunc): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    Alert.alert(t ? t("sharingNotAvailable") : "Sharing is not available on this device");
    return;
  }
  try {
    await Sharing.shareAsync(file.uri, { mimeType, UTI });
  } finally {
    try { file.delete(); } catch {}
  }
}

export async function exportAsJSON(t?: TFunc): Promise<void> {
  const data = await api.exportAllData();
  const json = JSON.stringify(data, null, 2);

  const file = new File(Paths.cache, `stash_export_${Date.now()}.json`);
  file.write(json);

  await shareAndCleanup(file, "application/json", "public.json", t);
}

export async function exportAsCSV(t?: TFunc): Promise<void> {
  const data = await api.exportAllData();
  const csv = api.dataToCSV(data.items, t);

  const file = new File(Paths.cache, `stash_export_${Date.now()}.csv`);
  file.write("\uFEFF" + csv);

  await shareAndCleanup(file, "text/csv", "public.comma-separated-values-text", t);
}
