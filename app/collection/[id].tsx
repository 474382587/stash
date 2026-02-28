import * as React from "react";

import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Button from "src/components/Button";
import EmptyState from "src/components/EmptyState";
import ItemCard from "src/components/ItemCard";
import ItemListRow from "src/components/ItemListRow";
import { formatMoney } from "src/lib/format";
import { fontSize, radius, spacing, useTheme } from "src/theme";
import * as api from "src/services/api";
import type { Item, ItemStatus, SortDir, SortField, ViewMode } from "src/services/api";
import { useCollections } from "src/store/useCollections";
import { useItems } from "src/store/useItems";

function useDeleteCollection() {
  const { t } = useTranslation();
  const router = useRouter();
  const posthog = usePostHog();
  const loadCollections = useCollections((s) => s.load);

  return (id: number, name: string) => {
    Alert.alert(
      t("deleteCollection"),
      t("deleteCollectionConfirm", { name }),
      [
        { style: "cancel", text: t("cancel") },
        {
          onPress: async () => {
            try {
              posthog.capture("collection_deleted");
              await api.deleteCollection(id);
              await loadCollections();
              router.back();
            } catch {}
          },
          style: "destructive",
          text: t("delete"),
        },
      ]
    );
  };
}

const STATUS_TABS: { icon: string; key: string; value: ItemStatus }[] = [
  { icon: "✨", key: "owned", value: "owned" },
  { icon: "💫", key: "wishlist", value: "wishlist" },
  { icon: "💸", key: "sold", value: "sold" },
  { icon: "🔄", key: "traded", value: "traded" },
];

const SORT_OPTIONS: { key: string; value: SortField }[] = [
  { key: "dateAdded", value: "created_at" },
  { key: "name", value: "name" },
  { key: "price", value: "purchase_price" },
  { key: "rating", value: "rating" },
  { key: "customSort", value: "sort_order" },
];

const VIEW_ICONS: { icon: "grid" | "list" | "image"; value: ViewMode }[] = [
  { icon: "grid", value: "grid" },
  { icon: "list", value: "list" },
  { icon: "image", value: "large" },
];

export default function CollectionDetailScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const collectionId = Number(id);
  const colors = useTheme();
  const router = useRouter();
  const confirmDelete = useDeleteCollection();

  const collections = useCollections((s) => s.collections);
  const loadCollections = useCollections((s) => s.load);
  const collection = collections.find((c) => c.id === collectionId);
  const {
    items, load, reorder,
    setSort, setViewMode, sortDir, sortField, viewMode,
  } = useItems();

  const [activeStatus, setActiveStatus] = React.useState<ItemStatus>("owned");
  const [refreshing, setRefreshing] = React.useState(false);
  const [brands, setBrands] = React.useState<string[]>([]);
  const [filterBrand, setFilterBrand] = React.useState<string | undefined>();
  const [isEditing, setIsEditing] = React.useState(false);
  const [showSortModal, setShowSortModal] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      if (collectionId) {
        load(collectionId, { status: activeStatus, filterBrand });
        api.getBrands(collectionId).then(setBrands).catch(() => {});
        loadCollections();
      }
    }, [collectionId, activeStatus, sortField, sortDir, filterBrand])
  );

  async function refresh() {
    setRefreshing(true);
    try {
      await Promise.all([
        load(collectionId, { status: activeStatus, filterBrand }),
        loadCollections(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }

  function toggleSortDir() {
    const newDir: SortDir = sortDir === "desc" ? "asc" : "desc";
    setSort(sortField, newDir);
  }

  function handleMoveItem(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newItems = [...items];
    const [moved] = newItems.splice(index, 1);
    newItems.splice(newIndex, 0, moved);

    const updates = newItems.map((item, i) => ({ id: item.id, sort_order: i }));
    reorder(updates);
  }

  function renderGridItem({ item, index }: { item: Item; index: number }) {
    if (isEditing) {
      return (
        <View style={[styles.editCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.editName, { color: colors.text }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.editBtns}>
            <Pressable
              onPress={() => handleMoveItem(index, -1)}
              disabled={index === 0}
              style={{ opacity: index === 0 ? 0.3 : 1 }}
            >
              <Ionicons name="chevron-up" size={22} color={colors.text} />
            </Pressable>
            <Pressable
              onPress={() => handleMoveItem(index, 1)}
              disabled={index === items.length - 1}
              style={{ opacity: index === items.length - 1 ? 0.3 : 1 }}
            >
              <Ionicons name="chevron-down" size={22} color={colors.text} />
            </Pressable>
          </View>
        </View>
      );
    }

    if (viewMode === "list") {
      return (
        <ItemListRow
          item={item}
          onPress={() => router.push(`/item/${item.id}`)}
        />
      );
    }

    return (
      <ItemCard
        item={item}
        onPress={() => router.push(`/item/${item.id}`)}
        viewMode={viewMode}
      />
    );
  }

  if (!collection) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <EmptyState icon="❌" title={t("notFound")} message={t("collectionNotFound")} />
      </View>
    );
  }

  const useColumns = viewMode === "grid" && !isEditing;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={items}
        key={`${viewMode}-${isEditing ? "edit" : "view"}`}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderGridItem}
        numColumns={useColumns ? 2 : 1}
        columnWrapperStyle={useColumns ? styles.row : undefined}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.header}>
              <Pressable onPress={() => router.back()} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={24} color={colors.text} />
              </Pressable>
              <View style={styles.headerInfo}>
                <Text style={styles.headerIcon}>{collection.icon}</Text>
                <Text style={[styles.headerName, { color: colors.text }]} numberOfLines={1}>
                  {collection.name}
                </Text>
              </View>
              <View style={styles.headerActions}>
                <Pressable
                  onPress={() => router.push(`/edit-collection?id=${collectionId}`)}
                  style={styles.headerBtn}
                >
                  <Ionicons name="create-outline" size={22} color={colors.text} />
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(collectionId, collection.name)}
                  style={styles.headerBtn}
                >
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </Pressable>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.metaRow}>
              <View style={[styles.metaChip, { backgroundColor: colors.card }]}>
                <Text style={[styles.metaValue, { color: colors.text }]}>
                  {collection.item_count ?? 0}
                </Text>
                <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>{t("itemsLabel")}</Text>
              </View>
              {(collection.total_value ?? 0) > 0 && (
                <View style={[styles.metaChip, { backgroundColor: colors.card }]}>
                  <Text style={[styles.metaValue, { color: colors.primary }]}>
                    {formatMoney(collection.total_value)}
                  </Text>
                  <Text style={[styles.metaLabel, { color: colors.textSecondary }]}>{t("totalValue")}</Text>
                </View>
              )}
            </View>

            {/* Status Tabs */}
            <View style={styles.statusTabs}>
              {STATUS_TABS.map((tab) => (
                <Pressable
                  key={tab.value}
                  onPress={() => { setActiveStatus(tab.value); setIsEditing(false); }}
                  style={[
                    styles.statusTab,
                    activeStatus === tab.value && {
                      borderBottomColor: colors.primary,
                      borderBottomWidth: 2,
                    },
                  ]}
                >
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={[
                      styles.statusTabText,
                      { color: activeStatus === tab.value ? colors.text : colors.muted },
                    ]}
                  >
                    {tab.icon} {t(tab.key)}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Toolbar: View mode + Sort + Filter + Edit */}
            <View style={styles.toolbar}>
              <View style={styles.viewToggle}>
                {VIEW_ICONS.map((v) => (
                  <Pressable
                    key={v.value}
                    onPress={() => { setViewMode(v.value); setIsEditing(false); }}
                    style={[
                      styles.viewBtn,
                      viewMode === v.value && !isEditing && {
                        backgroundColor: colors.primary + "20",
                      },
                    ]}
                  >
                    <Ionicons
                      name={v.icon}
                      size={18}
                      color={viewMode === v.value && !isEditing ? colors.primary : colors.muted}
                    />
                  </Pressable>
                ))}
              </View>

              <View style={styles.toolbarRight}>
                {/* Brand filter */}
                {brands.length > 0 && (
                  <Pressable
                    onPress={() => {
                      if (filterBrand) {
                        setFilterBrand(undefined);
                      } else {
                        Alert.alert(
                          t("filterByBrand"),
                          undefined,
                          [
                            ...brands.map((b) => ({
                              onPress: () => setFilterBrand(b),
                              text: b,
                            })),
                            { style: "cancel" as const, text: t("cancel") },
                          ]
                        );
                      }
                    }}
                    style={[
                      styles.toolBtn,
                      filterBrand && { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <Ionicons
                      name="funnel"
                      size={16}
                      color={filterBrand ? colors.primary : colors.muted}
                    />
                    {filterBrand && (
                      <Text style={[styles.filterLabel, { color: colors.primary }]}>
                        {filterBrand}
                      </Text>
                    )}
                  </Pressable>
                )}

                {/* Sort */}
                <Pressable
                  onPress={() => setShowSortModal(true)}
                  style={styles.toolBtn}
                >
                  <Ionicons name="swap-vertical" size={16} color={colors.muted} />
                </Pressable>

                {/* Sort direction */}
                <Pressable onPress={toggleSortDir} style={styles.toolBtn}>
                  <Ionicons
                    name={sortDir === "asc" ? "arrow-up" : "arrow-down"}
                    size={16}
                    color={colors.muted}
                  />
                </Pressable>

                {/* Edit mode (drag reorder) */}
                <Pressable
                  onPress={() => {
                    if (!isEditing) {
                      setSort("sort_order", "asc");
                    }
                    setIsEditing(!isEditing);
                  }}
                  style={[
                    styles.toolBtn,
                    isEditing && { backgroundColor: colors.primary + "20" },
                  ]}
                >
                  <Ionicons
                    name={isEditing ? "checkmark" : "reorder-three"}
                    size={18}
                    color={isEditing ? colors.primary : colors.muted}
                  />
                </Pressable>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon={activeStatus === "wishlist" ? "💫" : "✨"}
            title={
              activeStatus === "owned" ? t("emptyItems")
                : activeStatus === "wishlist" ? t("emptyWishlist")
                : activeStatus === "sold" ? t("noSold")
                : t("noTraded")
            }
            message={t("emptyItemsMsg")}
            action={
              <Button
                label={t("add")}
                onPress={() =>
                  router.push(
                    `/add-item?collectionId=${collectionId}&status=${activeStatus}`
                  )
                }
              />
            }
          />
        }
      />

      {/* FAB */}
      {!isEditing && (
        <Pressable
          onPress={() =>
            router.push(
              `/add-item?collectionId=${collectionId}&status=${activeStatus}`
            )
          }
          style={[styles.fab, { backgroundColor: collection.color || colors.primary }]}
        >
          <Ionicons name="add" size={28} color="#FFF" />
        </Pressable>
      )}

      {/* Sort Modal */}
      <Modal
        animationType="slide"
        transparent
        visible={showSortModal}
        onRequestClose={() => setShowSortModal(false)}
      >
        <Pressable
          onPress={() => setShowSortModal(false)}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t("sortBy")}</Text>
            {SORT_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                onPress={() => {
                  setSort(opt.value, sortDir);
                  setShowSortModal(false);
                  setIsEditing(false);
                }}
                style={[
                  styles.sortOption,
                  sortField === opt.value && { backgroundColor: colors.primary + "15" },
                ]}
              >
                <Text
                  style={[
                    styles.sortOptionText,
                    { color: sortField === opt.value ? colors.primary : colors.text },
                  ]}
                >
                  {t(opt.key)}
                </Text>
                {sortField === opt.value && (
                  <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
              </Pressable>
            ))}
            <Pressable
              onPress={() => setShowSortModal(false)}
              style={[styles.sortOption, { marginTop: spacing.sm }]}
            >
              <Text style={[styles.sortOptionText, { color: colors.muted }]}>{t("cancel")}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    marginRight: spacing.sm,
    padding: spacing.xs,
  },
  container: {
    flex: 1,
  },
  editBtns: {
    flexDirection: "row",
    gap: spacing.md,
  },
  editCard: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  editName: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: "500",
    marginRight: spacing.md,
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
  filterLabel: {
    fontSize: fontSize.xs,
    fontWeight: "600",
    marginLeft: 2,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: spacing.md,
    paddingTop: spacing.xl,
  },
  headerActions: {
    flexDirection: "row",
    gap: spacing.xs,
    marginLeft: "auto",
  },
  headerBtn: {
    padding: spacing.xs,
  },
  headerIcon: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  headerInfo: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
  },
  headerName: {
    fontSize: fontSize.xxl,
    fontWeight: "800",
  },
  list: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  metaChip: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  metaLabel: {
    fontSize: fontSize.sm,
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  metaValue: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  modalContent: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: 40,
  },
  modalOverlay: {
    backgroundColor: "rgba(0,0,0,0.5)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
    marginBottom: spacing.lg,
  },
  row: {
    justifyContent: "space-between",
  },
  sortOption: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  sortOptionText: {
    fontSize: fontSize.md,
  },
  statusTab: {
    alignItems: "center",
    flex: 1,
    paddingBottom: spacing.sm,
    paddingHorizontal: 2,
  },
  statusTabText: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    textAlign: "center",
  },
  statusTabs: {
    borderBottomColor: "rgba(128,128,128,0.2)",
    borderBottomWidth: 1,
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  toolBtn: {
    alignItems: "center",
    borderRadius: radius.sm,
    flexDirection: "row",
    padding: 6,
  },
  toolbar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  toolbarRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  viewBtn: {
    borderRadius: radius.sm,
    padding: 6,
  },
  viewToggle: {
    flexDirection: "row",
    gap: 2,
  },
});
