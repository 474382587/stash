import * as React from "react";

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Button from "src/components/Button";
import EmptyState from "src/components/EmptyState";
import { formatMoney } from "src/lib/format";
import { fontSize, radius, spacing, useTheme } from "src/theme";
import type { Collection } from "src/services/api";
import { useCollections } from "src/store/useCollections";

export default function CollectionsScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const { collections, delete: deleteCollection, load } = useCollections();
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (collections.length === 0) load();
  }, []);

  function confirmDelete(c: Collection) {
    Alert.alert(
      t("deleteCollection"),
      t("deleteCollectionConfirm", { name: c.name }),
      [
        { style: "cancel", text: t("cancel") },
        {
          onPress: () => deleteCollection(c.id),
          style: "destructive",
          text: t("delete"),
        },
      ]
    );
  }

  function renderItem({ item }: { item: Collection }) {
    return (
      <Pressable
        onPress={() => router.push(`/collection/${item.id}`)}
        onLongPress={() => confirmDelete(item)}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        {item.cover_photo ? (
          <Image
            source={{ uri: item.cover_photo }}
            style={styles.cover}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.cover,
              styles.iconWrap,
              { backgroundColor: (item.color || "#6366F1") + "15" },
            ]}
          >
            <Text style={styles.emoji}>{item.icon}</Text>
          </View>
        )}
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {item.icon} {item.name}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </View>
          <View style={styles.metaRow}>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {item.item_count ?? 0} {t("items")}
            </Text>
            {(item.total_value ?? 0) > 0 && (
              <Text style={[styles.meta, { color: colors.primary }]}>
                {formatMoney(item.total_value)}
              </Text>
            )}
          </View>
          {item.description && (
            <Text
              style={[styles.desc, { color: colors.muted }]}
              numberOfLines={1}
            >
              {item.description}
            </Text>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        automaticallyAdjustContentInsets={false}
        contentInsetAdjustmentBehavior="never"
        data={collections}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              try { await load(); } finally { setRefreshing(false); }
            }}
          />
        }
        ListEmptyComponent={
          <EmptyState
            action={
              <Button
                label={t("createCollection")}
                onPress={() => router.push("/add-collection")}
              />
            }
            icon="📂"
            message={t("emptyCollectionsMsg")}
            title={t("emptyCollections")}
          />
        }
      />
      {collections.length > 0 && (
        <Pressable
          onPress={() => router.push("/add-collection")}
          style={[styles.fab, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    flexDirection: "row",
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  container: {
    flex: 1,
  },
  cover: {
    height: 100,
    width: 100,
  },
  desc: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  emoji: {
    fontSize: 36,
  },
  fab: {
    alignItems: "center",
    borderRadius: radius.full,
    bottom: 24,
    elevation: 4,
    height: 56,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    shadowColor: "#000",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    width: 56,
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  info: {
    flex: 1,
    justifyContent: "center",
    padding: spacing.md,
  },
  list: {
    paddingBottom: 100,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  meta: {
    fontSize: fontSize.sm,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: 4,
  },
  name: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: "600",
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
  },
});
