import { Alert } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import * as api from "src/services/api";

async function shareAndCleanup(file: File, mimeType: string, UTI: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    Alert.alert("Sharing is not available on this device");
    return;
  }
  try {
    await Sharing.shareAsync(file.uri, { mimeType, UTI });
  } finally {
    try { file.delete(); } catch {}
  }
}

export async function exportAsJSON(): Promise<void> {
  const data = await api.exportAllData();
  const json = JSON.stringify(data, null, 2);

  const file = new File(Paths.cache, `stash_export_${Date.now()}.json`);
  file.write(json);

  await shareAndCleanup(file, "application/json", "public.json");
}

export async function exportAsCSV(): Promise<void> {
  const data = await api.exportAllData();
  const csv = api.dataToCSV(data.items);

  const file = new File(Paths.cache, `stash_export_${Date.now()}.csv`);
  file.write("\uFEFF" + csv);

  await shareAndCleanup(file, "text/csv", "public.comma-separated-values-text");
}
