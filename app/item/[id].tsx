import * as React from "react";

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as Sharing from "expo-sharing";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "react-i18next";
import MapView, { Marker } from "react-native-maps";
import { captureRef } from "react-native-view-shot";
import {
  ActionSheetIOS,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import ShareCard from "src/components/ShareCard";
import TagPill from "src/components/TagPill";
import { formatCondition, formatDate, formatMoney } from "src/lib/format";
import { pickFromLibrary, takePhoto } from "src/lib/photos";
import { fontSize, radius, spacing, useTheme } from "src/theme";
import * as api from "src/services/api";
import type { Item, Photo, Tag } from "src/services/api";
import { useCollections } from "src/store/useCollections";

const SCREEN_WIDTH = Dimensions.get("window").width;

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const itemId = Number(id);
  const colors = useTheme();
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();
  const collections = useCollections((s) => s.collections);
  const loadCollections = useCollections((s) => s.load);

  const [item, setItem] = React.useState<Item | null>(null);
  const [photos, setPhotos] = React.useState<Photo[]>([]);
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [photoIndex, setPhotoIndex] = React.useState(0);
  const collection = item ? collections.find((c) => c.id === item.collection_id) : null;
  const [showShareModal, setShowShareModal] = React.useState(false);
  const [sharing, setSharing] = React.useState(false);
  const shareCardRef = React.useRef<View>(null);

  const loadItem = React.useCallback(async () => {
    try {
      const i = await api.getItem(itemId);
      setItem(i);
      if (i) {
        const p = await api.getPhotos(itemId);
        setPhotos(p);
        const itemTags = await api.getItemTags(itemId);
        setTags(itemTags);
      }
    } catch {}
  }, [itemId]);

  useFocusEffect(
    React.useCallback(() => {
      loadItem();
    }, [loadItem])
  );

  async function handleAddPhoto() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          cancelButtonIndex: 2,
          options: [t("takePhoto"), t("fromAlbum"), t("cancel")],
        },
        async (idx) => {
          try {
            let uri: string | null = null;
            if (idx === 0) uri = await takePhoto();
            else if (idx === 1) uri = await pickFromLibrary();
            if (uri) {
              await api.addPhoto(itemId, uri, photos.length === 0);
              loadItem();
              loadCollections();
            }
          } catch {}
        }
      );
    } else {
      try {
        const uri = await pickFromLibrary();
        if (uri) {
          await api.addPhoto(itemId, uri, photos.length === 0);
          loadItem();
          loadCollections();
        }
      } catch {}
    }
  }

  function handleDeletePhoto(photo: Photo) {
    Alert.alert(t("deletePhoto"), t("deletePhotoConfirm"), [
      { style: "cancel", text: t("cancel") },
      {
        onPress: async () => {
          try {
            await api.deletePhoto(photo.id);
            loadItem();
            loadCollections();
          } catch {}
        },
        style: "destructive",
        text: t("delete"),
      },
    ]);
  }

  async function handleSetCover(photo: Photo) {
    try {
      await api.setCoverPhoto(itemId, photo.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadItem();
      loadCollections();
    } catch {}
  }

  async function handleReplacePhoto(photo: Photo) {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          cancelButtonIndex: 2,
          options: [t("takePhoto"), t("fromAlbum"), t("cancel")],
        },
        async (idx) => {
          try {
            let uri: string | null = null;
            if (idx === 0) uri = await takePhoto();
            else if (idx === 1) uri = await pickFromLibrary();
            if (uri) {
              const wasCover = photo.is_cover === 1;
              await api.deletePhoto(photo.id);
              await api.addPhoto(itemId, uri, wasCover);
              loadItem();
              loadCollections();
            }
          } catch {}
        }
      );
    } else {
      try {
        const uri = await pickFromLibrary();
        if (uri) {
          const wasCover = photo.is_cover === 1;
          await api.deletePhoto(photo.id);
          await api.addPhoto(itemId, uri, wasCover);
          loadItem();
          loadCollections();
        }
      } catch {}
    }
  }

  function handleDelete() {
    if (!item) return;
    Alert.alert(t("deleteItem"), t("deleteItemConfirm", { name: item.name }), [
      { style: "cancel", text: t("cancel") },
      {
        onPress: async () => {
          try {
            posthog.capture("item_deleted");
            await api.deleteItem(itemId);
            await loadCollections();
            router.back();
          } catch {}
        },
        style: "destructive",
        text: t("delete"),
      },
    ]);
  }

  function handleEdit() {
    if (!item) return;
    router.push(`/add-item?collectionId=${item.collection_id}&itemId=${itemId}`);
  }

  function handleShare() {
    if (!item) return;
    setShowShareModal(true);
  }

  async function handleShareCapture() {
    if (!shareCardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(shareCardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, { mimeType: "image/png" });
        posthog.capture("item_shared");
      }
    } catch {
      Alert.alert(t("error"), t("exportFailed"));
    } finally {
      setSharing(false);
    }
  }

  if (!item) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: 60 }]}>
        <Pressable
          onPress={() => router.back()}
          style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={{ color: colors.muted, padding: spacing.lg }}>{t("loading")}</Text>
      </View>
    );
  }

  function renderDetail(label: string, value: string | null | undefined) {
    if (!value || value === "-") return null;
    return (
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
          {label}
        </Text>
        <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Photo Carousel */}
      {photos.length > 0 ? (
        <View>
          <FlatList
            data={photos}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => {
              const idx = Math.round(
                e.nativeEvent.contentOffset.x / SCREEN_WIDTH
              );
              setPhotoIndex(Math.max(0, Math.min(idx, photos.length - 1)));
            }}
            keyExtractor={(p) => String(p.id)}
            renderItem={({ item: photo }) => (
              <Pressable
                onLongPress={() => {
                  if (Platform.OS === "ios") {
                    ActionSheetIOS.showActionSheetWithOptions(
                      {
                        cancelButtonIndex: 3,
                        destructiveButtonIndex: 2,
                        options: [t("setCover"), t("replacePhoto"), t("deletePhoto"), t("cancel")],
                      },
                      (idx) => {
                        if (idx === 0) handleSetCover(photo);
                        else if (idx === 1) handleReplacePhoto(photo);
                        else if (idx === 2) handleDeletePhoto(photo);
                      }
                    );
                  }
                }}
              >
                <Image
                  source={{ uri: photo.uri }}
                  style={styles.carouselImage}
                  contentFit="cover"
                  transition={200}
                />
              </Pressable>
            )}
          />
          {photos.length > 1 && (
            <View style={styles.dots}>
              {photos.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i === photoIndex ? colors.primary : colors.muted,
                      width: i === photoIndex ? 20 : 6,
                    },
                  ]}
                />
              ))}
            </View>
          )}
        </View>
      ) : (
        <Pressable
          onPress={handleAddPhoto}
          style={[styles.noPhoto, { backgroundColor: colors.card }]}
        >
          <Ionicons name="camera-outline" size={48} color={colors.muted} />
          <Text style={[styles.noPhotoText, { color: colors.muted }]}>
            {t("tapToAddPhoto")}
          </Text>
        </Pressable>
      )}

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <View style={styles.topBarActions}>
          <Pressable onPress={handleEdit} style={styles.actionBtn}>
            <Ionicons name="create-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={handleAddPhoto} style={styles.actionBtn}>
            <Ionicons name="camera-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={handleShare} style={styles.actionBtn}>
            <Ionicons name="share-outline" size={22} color={colors.text} />
          </Pressable>
          <Pressable onPress={handleDelete} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={22} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      {/* Info */}
      <View style={styles.infoSection}>
        <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>

        {item.brand && (
          <Text style={[styles.brandModel, { color: colors.textSecondary }]}>
            {item.brand}
            {item.model ? ` · ${item.model}` : ""}
          </Text>
        )}

        {(item.purchase_price != null || item.current_value != null) && (
          <Text style={[styles.price, { color: colors.primary }]}>
            {formatMoney(
              item.current_value ?? item.purchase_price,
              item.currency
            )}
          </Text>
        )}

        {/* Rating */}
        {item.rating != null && item.rating > 0 && (
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Ionicons
                key={star}
                name={star <= (item.rating ?? 0) ? "star" : "star-outline"}
                size={20}
                color={star <= (item.rating ?? 0) ? "#F59E0B" : colors.muted}
              />
            ))}
          </View>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <TagPill key={tag.id} color={tag.color} label={tag.name} />
            ))}
          </View>
        )}
      </View>

      {/* Details */}
      <View style={[styles.detailsCard, { backgroundColor: colors.card }]}>
        {renderDetail(t("condition"), formatCondition(item.condition, t))}
        {renderDetail(t("purchaseDate"), formatDate(item.purchase_date))}
        {renderDetail(t("storeName"), item.store_name ?? undefined)}
        {renderDetail(t("location"), item.purchase_location ?? undefined)}
        {item.purchase_price != null &&
          item.current_value != null &&
          item.current_value !== item.purchase_price &&
          renderDetail(
            t("purchasePrice"),
            formatMoney(item.purchase_price, item.currency)
          )}
        {item.current_value != null &&
          renderDetail(
            t("currentValue"),
            formatMoney(item.current_value, item.currency)
          )}
      </View>

      {/* Notes */}
      {item.notes && (
        <View style={[styles.notesCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>
            {t("notes")}
          </Text>
          <Text style={[styles.notesText, { color: colors.text }]}>
            {item.notes}
          </Text>
        </View>
      )}

      {item.receipt_uri && (
        <View style={[styles.notesCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>
            {t("receipt")}
          </Text>
          <Image
            contentFit="contain"
            source={{ uri: item.receipt_uri }}
            style={{ borderRadius: 12, height: 200, width: "100%" }}
          />
        </View>
      )}

      {item.purchase_location && (
        <View style={[styles.notesCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.notesLabel, { color: colors.textSecondary }]}>
            {t("location")}
          </Text>
          <View style={{ alignItems: "center", flexDirection: "row", gap: 6 }}>
            <Ionicons
              color={colors.primary}
              name="location"
              size={16}
            />
            <Text style={[styles.notesText, { color: colors.text }]}>
              {item.purchase_location}
            </Text>
          </View>
          {item.location_lat != null && item.location_lng != null && (
            <MapView
              initialRegion={{
                latitude: item.location_lat,
                latitudeDelta: 0.01,
                longitude: item.location_lng,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              style={{ borderRadius: 12, height: 160, marginTop: 12 }}
              zoomEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: item.location_lat,
                  longitude: item.location_lng,
                }}
              />
            </MapView>
          )}
        </View>
      )}

      <View style={{ height: 40 }} />

      {/* Share Card Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={showShareModal}
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.shareModalOverlay}>
          <View style={styles.shareModalContent}>
            <ScrollView
              contentContainerStyle={styles.shareScrollContent}
              showsVerticalScrollIndicator={false}
            >
              <ShareCard
                ref={shareCardRef}
                collectionName={collection?.name}
                item={item}
                photoUri={photos[0]?.uri}
                tags={tags}
              />
            </ScrollView>
            <View style={styles.shareModalActions}>
              <Pressable
                onPress={() => setShowShareModal(false)}
                style={[styles.shareBtn, { backgroundColor: colors.card }]}
              >
                <Text style={[styles.shareBtnText, { color: colors.text }]}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={handleShareCapture}
                style={[styles.shareBtn, { backgroundColor: colors.primary }]}
              >
                {sharing ? (
                  <Text style={[styles.shareBtnText, { color: "#FFF" }]}>{t("loading")}</Text>
                ) : (
                  <>
                    <Ionicons name="share-outline" size={18} color="#FFF" />
                    <Text style={[styles.shareBtnText, { color: "#FFF" }]}>{t("shareCard")}</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  actionBtn: {
    padding: spacing.sm,
  },
  backBtn: {
    padding: spacing.sm,
  },
  brandModel: {
    fontSize: fontSize.md,
    marginTop: spacing.xs,
  },
  carouselImage: {
    height: 360,
    width: SCREEN_WIDTH,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    marginRight: spacing.md,
    minWidth: 70,
  },
  detailRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    paddingVertical: spacing.sm,
  },
  detailValue: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: "500",
  },
  detailsCard: {
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  dot: {
    borderRadius: 3,
    height: 6,
  },
  dots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  infoSection: {
    padding: spacing.lg,
  },
  itemName: {
    fontSize: fontSize.xxl,
    fontWeight: "800",
  },
  noPhoto: {
    alignItems: "center",
    height: 240,
    justifyContent: "center",
  },
  noPhotoText: {
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  notesCard: {
    borderRadius: radius.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  notesLabel: {
    fontSize: fontSize.sm,
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  notesText: {
    fontSize: fontSize.md,
    lineHeight: 22,
  },
  price: {
    fontSize: fontSize.xl,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  ratingRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: spacing.sm,
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  topBarActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  shareModalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    flex: 1,
    justifyContent: "center",
    padding: spacing.lg,
  },
  shareModalContent: {
    maxHeight: "90%",
    width: "100%",
  },
  shareScrollContent: {
    alignItems: "center",
    paddingBottom: spacing.md,
  },
  shareModalActions: {
    flexDirection: "row",
    gap: spacing.md,
    justifyContent: "center",
    paddingTop: spacing.md,
  },
  shareBtn: {
    alignItems: "center",
    borderRadius: radius.full,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  shareBtnText: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});
