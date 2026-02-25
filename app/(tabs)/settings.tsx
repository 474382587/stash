import * as React from "react";
import { useTranslation } from "react-i18next";

import { Ionicons } from "@expo/vector-icons";
import { usePostHog } from "posthog-react-native";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import i18n from "src/i18n";
import { exportAsCSV, exportAsJSON } from "src/lib/export";
import { fontSize, radius, spacing, useTheme } from "src/theme";
import { useSettings } from "src/store/useSettings";
import { useTags } from "src/store/useTags";

const TAG_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444", "#F59E0B",
  "#22C55E", "#06B6D4", "#3B82F6", "#F97316", "#14B8A6",
];

const CURRENCIES = ["CAD", "CNY", "EUR", "GBP", "HKD", "JPY", "KRW", "TWD", "USD"];

export default function SettingsScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const posthog = usePostHog();
  const { currency, set: setSetting } = useSettings();
  const { create: createTag, delete: deleteTag, load: loadTags, tags } = useTags();

  const [newTagColor, setNewTagColor] = React.useState(TAG_COLORS[0]);
  const [newTagName, setNewTagName] = React.useState("");

  async function handleAddTag() {
    if (!newTagName.trim()) return;
    try {
      await createTag(newTagName.trim(), newTagColor);
      posthog.capture("tag_created");
      setNewTagName("");
    } catch {
      Alert.alert(t("error"), t("tagExists"));
    }
  }

  function handleDeleteTag(id: number, name: string) {
    Alert.alert(t("deleteTag"), t("deleteTagConfirm", { name }), [
      { style: "cancel", text: t("cancel") },
      {
        onPress: () => deleteTag(id),
        style: "destructive",
        text: t("delete"),
      },
    ]);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Language */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("language")}</Text>
      <View style={styles.currencyRow}>
        {[
          { code: "en", label: "English" },
          { code: "zh-Hant", label: "繁體中文" },
          { code: "zh", label: "简体中文" },
          { code: "ko", label: "한국어" },
          { code: "ja", label: "日本語" },
        ].map((lang) => (
          <Pressable
            key={lang.code}
            onPress={() => {
              i18n.changeLanguage(lang.code);
              setSetting("language", lang.code);
              posthog.capture("language_changed", { language: lang.code });
            }}
            style={[
              styles.currencyBtn,
              {
                backgroundColor: i18n.language === lang.code ? colors.primary : colors.card,
              },
            ]}
          >
            <Text
              style={[
                styles.currencyText,
                { color: i18n.language === lang.code ? "#FFF" : colors.text },
              ]}
            >
              {lang.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Currency */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("currency")}</Text>
      <View style={styles.currencyRow}>
        {CURRENCIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => {
              setSetting("currency", c);
              posthog.capture("currency_changed", { currency: c });
            }}
            style={[
              styles.currencyBtn,
              {
                backgroundColor: currency === c ? colors.primary : colors.card,
              },
            ]}
          >
            <Text
              style={[
                styles.currencyText,
                { color: currency === c ? "#FFF" : colors.text },
              ]}
            >
              {c}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tags */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("tagManagement")}</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.newTagRow}>
          <TextInput
            onChangeText={setNewTagName}
            onSubmitEditing={handleAddTag}
            placeholder={t("newTag")}
            placeholderTextColor={colors.muted}
            returnKeyType="done"
            style={[styles.tagInput, { backgroundColor: colors.cardAlt, color: colors.text }]}
            value={newTagName}
          />
          <Pressable
            onPress={handleAddTag}
            style={[styles.addTagBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={22} color="#FFF" />
          </Pressable>
        </View>

        <View style={styles.tagColorRow}>
          {TAG_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => setNewTagColor(c)}
              style={[
                styles.tagColorDot,
                {
                  backgroundColor: c,
                  borderColor: "#FFF",
                  borderWidth: newTagColor === c ? 2 : 0,
                  transform: [{ scale: newTagColor === c ? 1.2 : 1 }],
                },
              ]}
            />
          ))}
        </View>

        {tags.length === 0 && (
          <Text style={[styles.emptyTagText, { color: colors.muted }]}>
            {t("emptyTags")}
          </Text>
        )}

        {tags.map((tag) => (
          <View key={tag.id} style={styles.tagRow}>
            <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
            <Text style={[styles.tagName, { color: colors.text }]}>
              {tag.name}
            </Text>
            <Text style={[styles.tagCount, { color: colors.muted }]}>
              {tag.item_count ?? 0} {t("items")}
            </Text>
            <Pressable onPress={() => handleDeleteTag(tag.id, tag.name)}>
              <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
            </Pressable>
          </View>
        ))}
      </View>

      {/* Export */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("dataExport")}</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Pressable
          onPress={() => {
            posthog.capture("data_exported", { format: "json" });
            exportAsJSON().catch(() => Alert.alert(t("exportFailed")));
          }}
          style={styles.exportBtn}
        >
          <Ionicons name="code-slash" size={20} color={colors.primary} />
          <View style={styles.exportInfo}>
            <Text style={[styles.exportTitle, { color: colors.text }]}>
              {t("exportJSON")}
            </Text>
            <Text style={[styles.exportDesc, { color: colors.muted }]}>
              {t("exportJSONDesc")}
            </Text>
          </View>
          <Ionicons name="share-outline" size={18} color={colors.muted} />
        </Pressable>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <Pressable
          onPress={() => {
            posthog.capture("data_exported", { format: "csv" });
            exportAsCSV().catch(() => Alert.alert(t("exportFailed")));
          }}
          style={styles.exportBtn}
        >
          <Ionicons name="document-text" size={20} color={colors.success} />
          <View style={styles.exportInfo}>
            <Text style={[styles.exportTitle, { color: colors.text }]}>
              {t("exportCSV")}
            </Text>
            <Text style={[styles.exportDesc, { color: colors.muted }]}>
              {t("exportCSVDesc")}
            </Text>
          </View>
          <Ionicons name="share-outline" size={18} color={colors.muted} />
        </Pressable>
      </View>

      {/* About */}
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("about")}</Text>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>
            {t("version")}
          </Text>
          <Text style={[styles.aboutValue, { color: colors.text }]}>1.0.0</Text>
        </View>
        <View style={styles.aboutRow}>
          <Text style={[styles.aboutLabel, { color: colors.textSecondary }]}>
            {t("appNameLabel")}
          </Text>
          <Text style={[styles.aboutValue, { color: colors.text }]}>{t("appName")}</Text>
        </View>
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  aboutLabel: {
    fontSize: fontSize.md,
  },
  aboutRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  aboutValue: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  addTagBtn: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  card: {
    borderRadius: radius.lg,
    marginBottom: spacing.xl,
    padding: spacing.lg,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  currencyBtn: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  currencyRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  currencyText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    marginVertical: spacing.xs,
  },
  emptyTagText: {
    fontSize: fontSize.sm,
    marginTop: spacing.md,
    textAlign: "center",
  },
  exportBtn: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  exportDesc: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  newTagRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  tagColorDot: {
    borderRadius: radius.full,
    height: 24,
    width: 24,
  },
  tagColorRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  tagCount: {
    fontSize: fontSize.sm,
    marginRight: spacing.sm,
  },
  tagDot: {
    borderRadius: radius.full,
    height: 12,
    marginRight: spacing.sm,
    width: 12,
  },
  tagInput: {
    borderRadius: radius.md,
    flex: 1,
    fontSize: fontSize.md,
    padding: spacing.sm,
  },
  tagName: {
    flex: 1,
    fontSize: fontSize.md,
  },
  tagRow: {
    alignItems: "center",
    flexDirection: "row",
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
});
