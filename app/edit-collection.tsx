import * as React from "react";

import { useTranslation } from "react-i18next";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Button from "src/components/Button";
import { fontSize, radius, spacing, useTheme } from "src/theme";
import * as api from "src/services/api";
import { useCollections } from "src/store/useCollections";

const ICONS = ["👟", "⌚", "🎮", "📚", "💎", "🎨", "🧸", "🎵", "📷", "🏀", "🧢", "👜", "🍷", "🪙", "🃏", "🎯", "🏎️", "✈️", "📦", "⭐"];
const COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B",
  "#22C55E", "#06B6D4", "#3B82F6", "#F97316", "#14B8A6",
];

export default function EditCollectionScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const posthog = usePostHog();
  const { id: idStr } = useLocalSearchParams<{ id: string }>();
  const collectionId = idStr ? Number(idStr) : NaN;
  const loadCollections = useCollections((s) => s.load);
  const collections = useCollections((s) => s.collections);
  const collection = collections.find((c) => c.id === collectionId);

  const [color, setColor] = React.useState(collection?.color ?? COLORS[0]);
  const [description, setDescription] = React.useState(collection?.description ?? "");
  const [icon, setIcon] = React.useState(collection?.icon ?? "📦");
  const [name, setName] = React.useState(collection?.name ?? "");
  const [saving, setSaving] = React.useState(false);

  if (!collection || isNaN(collectionId)) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.muted }}>{t("notFound")}</Text>
      </View>
    );
  }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.updateCollection(collectionId, {
        color,
        description: description.trim() || null,
        icon,
        name: name.trim(),
      });
      posthog.capture("collection_updated");
      await loadCollections();
      router.back();
    } catch {
      Alert.alert(t("error"), t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={colors.text} />
          </Pressable>
          <Text style={[styles.heading, { color: colors.text }]}>{t("editCollection")}</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={[styles.previewCard, { backgroundColor: color + "15" }]}>
          <Text style={styles.previewIcon}>{icon}</Text>
          <Text style={[styles.previewName, { color: colors.text }]}>
            {name || t("collectionNamePlaceholder")}
          </Text>
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("name")}</Text>
        <TextInput
          onChangeText={setName}
          placeholder={t("collectionNamePlaceholder")}
          placeholderTextColor={colors.muted}
          style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
          value={name}
        />

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("icon")}</Text>
        <View style={styles.iconGrid}>
          {ICONS.map((ic) => (
            <Pressable
              key={ic}
              onPress={() => setIcon(ic)}
              style={[
                styles.iconBtn,
                {
                  backgroundColor: icon === ic ? color + "30" : colors.card,
                  borderColor: icon === ic ? color : "transparent",
                  borderWidth: icon === ic ? 2 : 0,
                },
              ]}
            >
              <Text style={styles.iconText}>{ic}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("themeColor")}</Text>
        <View style={styles.colorGrid}>
          {COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorBtn,
                {
                  backgroundColor: c,
                  borderColor: "#FFF",
                  borderWidth: color === c ? 3 : 0,
                  transform: [{ scale: color === c ? 1.15 : 1 }],
                },
              ]}
            />
          ))}
        </View>

        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {`${t("description")} (${t("optional")})`}
        </Text>
        <TextInput
          multiline
          numberOfLines={3}
          onChangeText={setDescription}
          placeholder={t("descriptionPlaceholder")}
          placeholderTextColor={colors.muted}
          style={[
            styles.input,
            styles.textArea,
            { backgroundColor: colors.card, color: colors.text },
          ]}
          value={description}
        />

        <Button
          disabled={!name.trim()}
          label={t("saveChanges")}
          loading={saving}
          onPress={handleSave}
          style={styles.saveBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  colorBtn: {
    borderRadius: radius.full,
    height: 36,
    width: 36,
  },
  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  container: {
    flex: 1,
  },
  heading: {
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  iconBtn: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconText: {
    fontSize: 24,
  },
  input: {
    borderRadius: radius.md,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginBottom: spacing.sm,
    textTransform: "uppercase",
  },
  previewCard: {
    alignItems: "center",
    borderRadius: radius.xl,
    marginBottom: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  previewIcon: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  previewName: {
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
  saveBtn: {
    marginTop: spacing.md,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
});
