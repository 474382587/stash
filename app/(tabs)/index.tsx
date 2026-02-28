import * as React from "react";

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
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
import ClusteredMapView from "react-native-map-clustering";
import { Marker } from "react-native-maps";
import type MapView from "react-native-maps";

import StatCard from "src/components/StatCard";
import { formatMoney } from "src/lib/format";
import { fontSize, radius, spacing, useTheme } from "src/theme";
import * as api from "src/services/api";
import type { Collection } from "src/services/api";
import { useCollections } from "src/store/useCollections";
import { useSettings } from "src/store/useSettings";

export default function HomeScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const router = useRouter();
  const { collections, load } = useCollections();
  const homeLocation = useSettings((s) => s.homeLocation);
  const mapRef = React.useRef<MapView>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [locationItems, setLocationItems] = React.useState<
    { id: number; name: string; location_lat: number; location_lng: number }[]
  >([]);
  const [stats, setStats] = React.useState({
    collection_count: 0,
    item_count: 0,
    photo_count: 0,
    total_value: 0,
    wishlist_count: 0,
  });

  const loadStats = React.useCallback(async () => {
    try {
      const [s, locs] = await Promise.all([
        api.getStats(),
        api.getItemsWithLocations(),
      ]);
      setStats(s);
      setLocationItems(locs);
    } catch {}
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadStats();
    }, [])
  );

  React.useEffect(() => {
    load();
  }, []);

  React.useEffect(() => {
    if (homeLocation) {
      mapRef.current?.animateToRegion({
        latitude: homeLocation.lat,
        latitudeDelta: 5,
        longitude: homeLocation.lng,
        longitudeDelta: 5,
      }, 500);
    }
  }, [homeLocation]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([load(), loadStats()]);
    } finally {
      setRefreshing(false);
    }
  }, []);

  function renderCollection({ item }: { item: Collection }) {
    return (
      <Pressable
        onPress={() => router.push(`/collection/${item.id}`)}
        style={({ pressed }) => [
          styles.collectionCard,
          { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        {item.cover_photo ? (
          <Image
            source={{ uri: item.cover_photo }}
            style={styles.collectionImage}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View
            style={[
              styles.collectionImage,
              styles.collectionIconWrap,
              { backgroundColor: (item.color || "#6366F1") + "20" },
            ]}
          >
            <Text style={styles.collectionEmoji}>{item.icon}</Text>
          </View>
        )}
        <View style={styles.collectionInfo}>
          <Text style={[styles.collectionName, { color: colors.text }]} numberOfLines={1}>
            {item.icon} {item.name}
          </Text>
          <Text style={[styles.collectionCount, { color: colors.textSecondary }]}>
            {item.item_count ?? 0} {t("items")}
          </Text>
        </View>
      </Pressable>
    );
  }

  function handleQuickAdd() {
    if (collections.length === 0) {
      Alert.alert(t("selectCollection"), t("noCollectionYet"), [
        { style: "cancel", text: t("cancel") },
        { onPress: () => router.push("/add-collection"), text: t("createCollection") },
      ]);
      return;
    }
    router.push("/add-item");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
      data={collections.slice(0, 6)}
      keyExtractor={(item) => String(item.id)}
      renderItem={renderCollection}
      numColumns={2}
      columnWrapperStyle={styles.row}
      contentContainerStyle={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
      automaticallyAdjustContentInsets={false}
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: colors.background }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListHeaderComponent={
        <View>
          <Text style={[styles.greeting, { color: colors.text }]}>
            {t("myCollections")}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {t("everything")}
          </Text>

          <View style={styles.statsRow}>
            <StatCard
              icon="📦"
              label={t("collection")}
              value={String(stats.collection_count)}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              icon="✨"
              label={t("itemsLabel")}
              value={String(stats.item_count)}
            />
            <View style={{ width: spacing.sm }} />
            <StatCard
              icon="💰"
              label={t("totalValue")}
              value={formatMoney(stats.total_value)}
            />
          </View>

          {stats.wishlist_count > 0 && (
            <View style={[styles.wishlistBanner, { backgroundColor: colors.card }]}>
              <Text style={{ fontSize: 20 }}>💫</Text>
              <Text style={[styles.wishlistText, { color: colors.textSecondary }]}>
                {t("wishlistBanner", { count: stats.wishlist_count })}
              </Text>
            </View>
          )}

          <View style={styles.mapSection}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("purchaseLocationsMap")}
            </Text>
            <ClusteredMapView
              ref={mapRef}
              initialRegion={{
                latitude: homeLocation?.lat ?? 20,
                longitude: homeLocation?.lng ?? 0,
                latitudeDelta: homeLocation ? 5 : 120,
                longitudeDelta: homeLocation ? 5 : 180,
              }}
              style={styles.map}
              clusterColor="#6366F1"
              clusterTextColor="#FFF"
              radius={40}
              minPoints={2}
            >
              {homeLocation && (
                <Marker
                  coordinate={{ latitude: homeLocation.lat, longitude: homeLocation.lng }}
                  title={homeLocation.name}
                  pinColor="#6366F1"
                  cluster={false}
                >
                  <View style={styles.homePin}>
                    <Ionicons name="home" size={16} color="#FFF" />
                  </View>
                </Marker>
              )}
              {locationItems.map((loc) => (
                <Marker
                  key={loc.id}
                  coordinate={{
                    latitude: loc.location_lat,
                    longitude: loc.location_lng,
                  }}
                  title={loc.name}
                />
              ))}
            </ClusteredMapView>
          </View>

          {collections.length > 0 && (
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("recentCollections")}
              </Text>
              <Pressable onPress={() => router.push("/collections")}>
                <Text style={{ color: colors.primary, fontSize: fontSize.sm }}>
                  {t("viewAll")}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      }
      ListEmptyComponent={
        <Pressable
          onPress={() => router.push("/add-collection")}
          style={[styles.emptyCard, { backgroundColor: colors.card }]}
        >
          <Ionicons name="add-circle" size={48} color={colors.primary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t("startJourney")}
          </Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {t("startJourneyMsg")}
          </Text>
        </Pressable>
      }
    />
      <Pressable onPress={handleQuickAdd} style={[styles.fab, { backgroundColor: colors.primary }]}>
        <Ionicons name="add" size={28} color="#FFF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  collectionCard: {
    borderRadius: radius.lg,
    flex: 1,
    margin: spacing.xs,
    overflow: "hidden",
  },
  collectionCount: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  collectionEmoji: {
    fontSize: 36,
  },
  collectionIconWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  collectionImage: {
    aspectRatio: 1.2,
    width: "100%",
  },
  collectionInfo: {
    padding: spacing.sm,
  },
  collectionName: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  container: {
    paddingBottom: 100,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  emptyCard: {
    alignItems: "center",
    borderRadius: radius.lg,
    paddingHorizontal: spacing.xxl,
    paddingVertical: 48,
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
  emptyText: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: "600",
    marginTop: spacing.lg,
  },
  greeting: {
    fontSize: fontSize.hero,
    fontWeight: "800",
  },
  homePin: {
    alignItems: "center",
    backgroundColor: "#6366F1",
    borderColor: "#FFF",
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    width: 32,
  },
  map: {
    borderRadius: radius.md,
    height: 200,
    marginTop: spacing.sm,
    overflow: "hidden",
    width: "100%",
  },
  mapSection: {
    marginBottom: spacing.xl,
    marginTop: spacing.xl,
  },
  row: {
    justifyContent: "space-between",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    marginTop: spacing.lg,
  },
  subtitle: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  wishlistBanner: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  wishlistText: {
    fontSize: fontSize.sm,
  },
});
