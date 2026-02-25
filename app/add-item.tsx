import * as React from "react";

import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "react-i18next";
import i18n from "src/i18n";
import MapView, { Marker } from "react-native-maps";
import {
  ActionSheetIOS,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import Button from "src/components/Button";
import TagPill from "src/components/TagPill";
import { pickFromLibrary, pickMultipleFromLibrary, takePhoto } from "src/lib/photos";
import { fontSize, radius, spacing, useTheme } from "src/theme";
import * as api from "src/services/api";
import { useCollections } from "src/store/useCollections";
import { useTags } from "src/store/useTags";

const CURRENCIES = ["CAD", "CNY", "EUR", "GBP", "HKD", "JPY", "KRW", "TWD", "USD"];
const SCREEN_WIDTH = Dimensions.get("window").width;

const STATUSES = [
  { icon: "✨", key: "owned", value: "owned" },
  { icon: "💫", key: "wishlist", value: "wishlist" },
  { icon: "💸", key: "sold", value: "sold" },
  { icon: "🔄", key: "traded", value: "traded" },
] as const;

const CONDITIONS = [
  { key: "conditionNew", value: "new" },
  { key: "conditionLikeNew", value: "like_new" },
  { key: "conditionGood", value: "good" },
  { key: "conditionFair", value: "fair" },
  { key: "conditionPoor", value: "poor" },
] as const;

export default function AddItemScreen() {
  const { collectionId: cidStr, itemId: itemIdStr, status: statusParam } = useLocalSearchParams<{
    collectionId?: string;
    itemId?: string;
    status?: string;
  }>();
  const paramCollectionId = cidStr ? Number(cidStr) : null;
  const editItemId = itemIdStr ? Number(itemIdStr) : null;
  const isEditMode = editItemId != null;
  const initialStatus = (statusParam as "owned" | "wishlist" | "sold" | "traded") || "owned";
  const colors = useTheme();
  const router = useRouter();
  const posthog = usePostHog();
  const { t } = useTranslation();

  const collections = useCollections((s) => s.collections);
  const loadCollections = useCollections((s) => s.load);
  const allTags = useTags((s) => s.tags);

  const [selectedCollectionId, setSelectedCollectionId] = React.useState<number | null>(paramCollectionId);
  const [showCollectionPicker, setShowCollectionPicker] = React.useState(false);
  const collectionId = selectedCollectionId ?? 0;
  const collection = collections.find((c) => c.id === collectionId);
  const needsCollectionPicker = paramCollectionId == null && !isEditMode;

  const [brand, setBrand] = React.useState("");
  const [condition, setCondition] = React.useState<string>("");
  const [currency, setCurrency] = React.useState("USD");
  const [loaded, setLoaded] = React.useState(!isEditMode);
  const [location, setLocation] = React.useState("");
  const [locationCoord, setLocationCoord] = React.useState<{ lat: number; lng: number } | null>(null);
  const [model, setModel] = React.useState("");
  const [name, setName] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [photos, setPhotos] = React.useState<string[]>([]);
  const [price, setPrice] = React.useState("");
  const [purchaseDate, setPurchaseDate] = React.useState<Date | null>(null);
  const [rating, setRating] = React.useState(0);
  const [receiptUri, setReceiptUri] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [storeName, setStoreName] = React.useState("");
  const [selectedTagIds, setSelectedTagIds] = React.useState<number[]>([]);
  const [showCurrencyModal, setShowCurrencyModal] = React.useState(false);
  const [showDateModal, setShowDateModal] = React.useState(false);
  const [showLocationModal, setShowLocationModal] = React.useState(false);
  const [status, setStatus] = React.useState(initialStatus);
  const [tempDate, setTempDate] = React.useState(new Date());
  const [tempMapCoord, setTempMapCoord] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [tempLocationName, setTempLocationName] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<{ display_name: string; lat: string; lon: string }[]>([]);
  const [searching, setSearching] = React.useState(false);
  const mapRef = React.useRef<MapView>(null);
  const searchDebounce = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      try {
        const item = await api.getItem(editItemId);
        if (!item) { setLoaded(true); return; }
        setBrand(item.brand ?? "");
        setCondition(item.condition ?? "");
        setCurrency(item.currency ?? "USD");
        setLocation(item.purchase_location ?? "");
        if (item.location_lat != null && item.location_lng != null) {
          setLocationCoord({ lat: item.location_lat, lng: item.location_lng });
        }
        setModel(item.model ?? "");
        setName(item.name);
        setNotes(item.notes ?? "");
        setPrice(item.purchase_price != null ? String(item.purchase_price) : "");
        if (item.purchase_date) setPurchaseDate(new Date(item.purchase_date));
        setRating(item.rating ?? 0);
        setReceiptUri(item.receipt_uri ?? null);
        setStatus(item.status);
        setStoreName(item.store_name ?? "");
        const tags = await api.getItemTags(editItemId);
        setSelectedTagIds(tags.map((tg) => tg.id));
        const existingPhotos = await api.getPhotos(editItemId);
        setPhotos(existingPhotos.map((p) => p.uri));
      } catch {}
      setLoaded(true);
    })();
  }, [editItemId]);

  React.useEffect(() => {
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, []);

  function showPhotoOptions() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          cancelButtonIndex: 3,
          options: [t("takePhoto"), t("fromAlbum"), t("fromAlbumMultiple"), t("cancel")],
        },
        async (idx) => {
          if (idx === 0) {
            const uri = await takePhoto();
            if (uri) setPhotos((prev) => [...prev, uri]);
          } else if (idx === 1) {
            const uri = await pickFromLibrary();
            if (uri) setPhotos((prev) => [...prev, uri]);
          } else if (idx === 2) {
            const uris = await pickMultipleFromLibrary();
            if (uris.length > 0) setPhotos((prev) => [...prev, ...uris]);
          }
        }
      );
    } else {
      pickMultipleFromLibrary().then((uris) => {
        if (uris.length > 0) setPhotos((prev) => [...prev, ...uris]);
      });
    }
  }

  async function handlePickReceipt() {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { cancelButtonIndex: 2, options: [t("takePhoto"), t("fromAlbum"), t("cancel")] },
        async (idx) => {
          if (idx === 0) {
            const uri = await takePhoto();
            if (uri) setReceiptUri(uri);
          } else if (idx === 1) {
            const uri = await pickFromLibrary();
            if (uri) setReceiptUri(uri);
          }
        }
      );
    } else {
      const uri = await pickFromLibrary();
      if (uri) setReceiptUri(uri);
    }
  }

  function removePhoto(index: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleTag(tagId: number) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  }

  function openDatePicker() {
    setTempDate(purchaseDate ?? new Date());
    setShowDateModal(true);
  }

  function confirmDate() {
    setPurchaseDate(tempDate);
    setShowDateModal(false);
  }

  function openLocationPicker() {
    setTempMapCoord(
      locationCoord
        ? { latitude: locationCoord.lat, longitude: locationCoord.lng }
        : null
    );
    setTempLocationName(location);
    setShowLocationModal(true);
  }

  function confirmLocation() {
    setLocation(tempLocationName);
    if (tempMapCoord) {
      setLocationCoord({ lat: tempMapCoord.latitude, lng: tempMapCoord.longitude });
    }
    setShowLocationModal(false);
  }

  function handleSearchInput(text: string) {
    setTempLocationName(text);
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    searchDebounce.current = setTimeout(() => searchPlaces(text.trim()), 500);
  }

  async function searchPlaces(query: string) {
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=10&accept-language=${i18n.language}`,
        { headers: { "User-Agent": "StashApp/1.0 (stash@app.com)" } }
      );
      if (!res.ok) { setSearchResults([]); return; }
      const data = await res.json();
      setSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }

  function selectSearchResult(result: { display_name: string; lat: string; lon: string }) {
    const latitude = parseFloat(result.lat);
    const longitude = parseFloat(result.lon);
    setTempMapCoord({ latitude, longitude });
    const parts = result.display_name.split(", ");
    setTempLocationName(parts.slice(0, 3).join(", "));
    setSearchResults([]);
    mapRef.current?.animateToRegion({
      latitude,
      latitudeDelta: 0.01,
      longitude,
      longitudeDelta: 0.01,
    }, 500);
  }

  async function reverseGeocode(lat: number, lng: number) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=${i18n.language}`,
        { headers: { "User-Agent": "StashApp/1.0 (stash@app.com)" } }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.display_name) {
        const parts = data.display_name.split(", ");
        setTempLocationName(parts.slice(0, 3).join(", "));
      }
    } catch {
      // Geocoding failed, keep manual input
    }
  }

  async function handleSave() {
    if (!name.trim()) return;
    if (!isEditMode && !collectionId) return;
    setSaving(true);
    try {
      const itemData = {
        brand: brand.trim() || null,
        condition: (condition as "new" | "like_new" | "good" | "fair" | "poor") || null,
        currency,
        is_wishlist: status === "wishlist" ? 1 : 0,
        location_lat: locationCoord?.lat ?? null,
        location_lng: locationCoord?.lng ?? null,
        model: model.trim() || null,
        name: name.trim(),
        notes: notes.trim() || null,
        purchase_date: purchaseDate ? purchaseDate.toISOString().split("T")[0] : null,
        purchase_location: location.trim() || null,
        purchase_price: price && !isNaN(parseFloat(price)) ? parseFloat(price) : null,
        rating: rating || null,
        receipt_uri: receiptUri,
        status,
        store_name: storeName.trim() || null,
      };

      if (isEditMode) {
        await api.updateItem(editItemId, itemData);
        await api.setItemTags(editItemId, selectedTagIds);
        posthog.capture("item_updated", { currency, status });
        await loadCollections();
      } else {
        const itemId = await api.createItem({
          ...itemData,
          collection_id: collectionId,
        });

        if (receiptUri) {
          const receiptId = await api.addPhoto(itemId, receiptUri, false);
          await api.updateItem(itemId, {
            receipt_uri: (await api.getPhotos(itemId)).find((p) => p.id === receiptId)?.uri ?? null,
          });
        }

        for (let i = 0; i < photos.length; i++) {
          await api.addPhoto(itemId, photos[i], i === 0);
        }

        if (selectedTagIds.length > 0) {
          await api.setItemTags(itemId, selectedTagIds);
        }

        posthog.capture("item_created", {
          currency,
          has_location: !!locationCoord,
          has_photos: photos.length > 0,
          has_receipt: !!receiptUri,
          photo_count: photos.length,
          status,
          tag_count: selectedTagIds.length,
        });
      }

      await loadCollections();
      router.back();
    } catch {
      Alert.alert(t("error"), t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.muted }}>{t("loading")}</Text>
      </View>
    );
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
          <Text style={[styles.heading, { color: colors.text }]}>{isEditMode ? t("editItem") : t("addItem")}</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Collection Picker (quick-add mode) */}
        {needsCollectionPicker && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t("selectCollection")} *</Text>
            <Pressable
              onPress={() => setShowCollectionPicker(true)}
              style={[styles.input, styles.collectionPickerBtn, { backgroundColor: colors.card }]}
            >
              {collection ? (
                <View style={styles.collectionPickerContent}>
                  <Text style={{ fontSize: 20 }}>{collection.icon}</Text>
                  <Text style={[styles.collectionPickerText, { color: colors.text }]}>{collection.name}</Text>
                </View>
              ) : (
                <Text style={[styles.collectionPickerText, { color: colors.muted }]}>
                  {t("selectCollectionHint")}
                </Text>
              )}
              <Ionicons name="chevron-down" size={18} color={colors.muted} />
            </Pressable>
          </>
        )}

        {!needsCollectionPicker && collection && (
          <View style={[styles.collectionBadge, { backgroundColor: collection.color + "20" }]}>
            <Text>{collection.icon}</Text>
            <Text style={[styles.badgeText, { color: colors.text }]}>{collection.name}</Text>
          </View>
        )}

        {/* Status */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("status")}</Text>
        <View style={styles.chipRow}>
          {STATUSES.map((s) => (
            <Pressable
              key={s.value}
              onPress={() => setStatus(s.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: status === s.value ? colors.primary + "20" : colors.card,
                  borderColor: status === s.value ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: status === s.value ? colors.primary : colors.text }]}>
                {s.icon} {t(s.key)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Photos */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("photos")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
          <Pressable onPress={showPhotoOptions} style={[styles.addPhotoBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="camera" size={28} color={colors.primary} />
            <Text style={[styles.addPhotoText, { color: colors.primary }]}>{t("addPhoto")}</Text>
          </Pressable>
          {photos.map((uri, index) => (
            <View key={uri + index} style={styles.photoWrap}>
              <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
              <Pressable onPress={() => removePhoto(index)} style={styles.photoRemove}>
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </Pressable>
              {index === 0 && (
                <View style={[styles.coverBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.coverText}>{t("coverPhoto")}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        {/* Name */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("name")} *</Text>
        <TextInput
          onChangeText={setName}
          placeholder={t("namePlaceholder")}
          placeholderTextColor={colors.muted}
          style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
          value={name}
        />

        {/* Brand & Model */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t("brand")}</Text>
            <TextInput onChangeText={setBrand} placeholder={t("brand")} placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, color: colors.text }]} value={brand} />
          </View>
          <View style={styles.col}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t("model")}</Text>
            <TextInput onChangeText={setModel} placeholder={t("model")} placeholderTextColor={colors.muted} style={[styles.input, { backgroundColor: colors.card, color: colors.text }]} value={model} />
          </View>
        </View>

        {/* Price + Currency */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {status === "wishlist" ? t("expectedPrice") : t("purchasePrice")}
        </Text>
        <View style={[styles.priceRow, { backgroundColor: colors.card }]}>
          <Pressable onPress={() => setShowCurrencyModal(true)} style={styles.currencyTag}>
            <Text style={[styles.currencyTagText, { color: colors.primary }]}>{currency}</Text>
            <Ionicons name="chevron-down" size={14} color={colors.primary} />
          </Pressable>
          <TextInput
            keyboardType="decimal-pad"
            onChangeText={setPrice}
            placeholder="0"
            placeholderTextColor={colors.muted}
            style={[styles.priceInput, { color: colors.text }]}
            value={price}
          />
        </View>

        {/* Purchase Date */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          {status === "wishlist" ? t("expectedDate") : t("purchaseDate")}
        </Text>
        <Pressable
          onPress={openDatePicker}
          style={[styles.input, styles.dateBtn, { backgroundColor: colors.card }]}
        >
          <Text style={{ color: purchaseDate ? colors.text : colors.muted, fontSize: fontSize.md }}>
            {purchaseDate ? purchaseDate.toISOString().split("T")[0] : "YYYY-MM-DD"}
          </Text>
          <Ionicons name="calendar-outline" size={18} color={colors.muted} />
        </Pressable>

        {/* Store Name */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("storeName")}</Text>
        <TextInput
          onChangeText={setStoreName}
          placeholder={t("storeNamePlaceholder")}
          placeholderTextColor={colors.muted}
          style={[styles.input, { backgroundColor: colors.card, color: colors.text }]}
          value={storeName}
        />

        {/* Location */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("location")}</Text>
        <Pressable
          onPress={openLocationPicker}
          style={[styles.input, styles.locationRow, { backgroundColor: colors.card }]}
        >
          <Ionicons name="location-outline" size={18} color={locationCoord ? colors.primary : colors.muted} />
          <Text
            style={[styles.locationText, { color: location ? colors.text : colors.muted }]}
            numberOfLines={1}
          >
            {location || t("locationPlaceholder")}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>

        {locationCoord && (
          <View style={styles.miniMapWrap}>
            <MapView
              style={styles.miniMap}
              region={{
                latitude: locationCoord.lat,
                latitudeDelta: 0.01,
                longitude: locationCoord.lng,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
            >
              <Marker coordinate={{ latitude: locationCoord.lat, longitude: locationCoord.lng }} />
            </MapView>
          </View>
        )}

        {/* Condition */}
        {status !== "wishlist" && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t("condition")}</Text>
            <View style={styles.chipRow}>
              {CONDITIONS.map((c) => (
                <Pressable
                  key={c.value}
                  onPress={() => setCondition(condition === c.value ? "" : c.value)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: condition === c.value ? colors.primary + "20" : colors.card,
                      borderColor: condition === c.value ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.chipText, { color: condition === c.value ? colors.primary : colors.text }]}>
                    {t(c.key)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Rating */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("rating")}</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Pressable key={star} onPress={() => setRating(rating === star ? 0 : star)}>
              <Ionicons name={star <= rating ? "star" : "star-outline"} size={32} color={star <= rating ? "#F59E0B" : colors.muted} />
            </Pressable>
          ))}
        </View>

        {/* Receipt */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("receipt")}</Text>
        {receiptUri ? (
          <View style={styles.receiptWrap}>
            <Image source={{ uri: receiptUri }} style={styles.receiptThumb} contentFit="cover" />
            <Pressable onPress={() => setReceiptUri(null)} style={styles.photoRemove}>
              <Ionicons name="close-circle" size={22} color="#EF4444" />
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={handlePickReceipt}
            style={[styles.receiptBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Ionicons name="receipt-outline" size={24} color={colors.muted} />
            <Text style={[styles.receiptBtnText, { color: colors.muted }]}>{t("addPhoto")}</Text>
          </Pressable>
        )}

        {/* Tags */}
        {allTags.length > 0 && (
          <>
            <Text style={[styles.label, { color: colors.textSecondary }]}>{t("tagManagement")}</Text>
            <View style={styles.chipRow}>
              {allTags.map((tag) => (
                <TagPill
                  key={tag.id}
                  color={tag.color}
                  label={tag.name}
                  onPress={() => toggleTag(tag.id)}
                  selected={selectedTagIds.includes(tag.id)}
                />
              ))}
            </View>
          </>
        )}

        {/* Notes */}
        <Text style={[styles.label, { color: colors.textSecondary }]}>{t("notes")}</Text>
        <TextInput
          multiline
          numberOfLines={4}
          onChangeText={setNotes}
          placeholder={t("notesPlaceholder")}
          placeholderTextColor={colors.muted}
          style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text }]}
          value={notes}
        />

        <Button disabled={!name.trim() || (!isEditMode && !collectionId)} label={isEditMode ? t("saveChanges") : t("save")} loading={saving} onPress={handleSave} style={styles.saveBtn} />
      </ScrollView>

      {/* ── Date Picker Modal ── */}
      <Modal animationType="slide" transparent visible={showDateModal} onRequestClose={() => setShowDateModal(false)}>
        <Pressable onPress={() => setShowDateModal(false)} style={styles.modalOverlay}>
          <View style={[styles.dateModalContent, { backgroundColor: colors.card }]}>
            <View style={styles.dateModalHeader}>
              <Pressable onPress={() => setShowDateModal(false)}>
                <Text style={[styles.dateModalBtn, { color: colors.muted }]}>{t("cancel")}</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {status === "wishlist" ? t("expectedDate") : t("purchaseDate")}
              </Text>
              <Pressable onPress={confirmDate}>
                <Text style={[styles.dateModalBtn, { color: colors.primary }]}>{t("save")}</Text>
              </Pressable>
            </View>
            <DateTimePicker
              display="spinner"
              mode="date"
              onChange={(_, date) => { if (date) setTempDate(date); }}
              style={styles.datePicker}
              value={tempDate}
            />
          </View>
        </Pressable>
      </Modal>

      {/* ── Location Picker Modal ── */}
      <Modal animationType="slide" visible={showLocationModal} onRequestClose={() => setShowLocationModal(false)}>
        <View style={[styles.locationModalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.locationModalHeader, { borderBottomColor: colors.border }]}>
            <Pressable onPress={() => setShowLocationModal(false)}>
              <Text style={[styles.dateModalBtn, { color: colors.muted }]}>{t("cancel")}</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t("location")}</Text>
            <Pressable onPress={confirmLocation}>
              <Text style={[styles.dateModalBtn, { color: colors.primary }]}>{t("save")}</Text>
            </Pressable>
          </View>

          <View style={{ flex: 1 }}>
            <MapView
              ref={mapRef}
              initialRegion={{
                latitude: tempMapCoord?.latitude ?? 35.68,
                latitudeDelta: 0.05,
                longitude: tempMapCoord?.longitude ?? 139.69,
                longitudeDelta: 0.05,
              }}
              onPress={(e) => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                setTempMapCoord({ latitude, longitude });
                setSearchResults([]);
                reverseGeocode(latitude, longitude);
              }}
              style={StyleSheet.absoluteFill}
            >
              {tempMapCoord && (
                <Marker coordinate={tempMapCoord} />
              )}
            </MapView>

            {/* Search bar floating on top of map */}
            <View style={styles.mapSearchOverlay} pointerEvents="box-none">
              <View style={[styles.searchBarWrap, styles.searchBarFloating, { backgroundColor: colors.card }]}>
                <Ionicons name="search" size={18} color={colors.muted} />
                <TextInput
                  onChangeText={handleSearchInput}
                  placeholder={t("locationPlaceholder")}
                  placeholderTextColor={colors.muted}
                  returnKeyType="search"
                  onSubmitEditing={() => { if (tempLocationName.trim()) searchPlaces(tempLocationName.trim()); }}
                  style={[styles.searchBarInput, { color: colors.text }]}
                  value={tempLocationName}
                />
                {tempLocationName.length > 0 && (
                  <Pressable onPress={() => { setTempLocationName(""); setSearchResults([]); }}>
                    <Ionicons name="close-circle" size={18} color={colors.muted} />
                  </Pressable>
                )}
              </View>

              {searchResults.length > 0 && (
                <ScrollView
                  style={[styles.searchResultsList, { backgroundColor: colors.card }]}
                  keyboardShouldPersistTaps="handled"
                >
                  {searchResults.map((result, idx) => (
                    <Pressable
                      key={`${result.lat}-${result.lon}-${idx}`}
                      onPress={() => selectSearchResult(result)}
                      style={[
                        styles.searchResultItem,
                        idx < searchResults.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                      ]}
                    >
                      <Ionicons name="location" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                      <Text style={[styles.searchResultText, { color: colors.text }]} numberOfLines={2}>
                        {result.display_name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

              {searching && (
                <View style={[styles.searchHintBadge, { backgroundColor: colors.card }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{t("loading")}</Text>
                </View>
              )}
            </View>

            {!searchResults.length && !searching && !tempMapCoord && (
              <View style={styles.mapHintOverlay} pointerEvents="none">
                <View style={[styles.searchHintBadge, { backgroundColor: colors.card }]}>
                  <Text style={{ color: colors.textSecondary, fontSize: fontSize.xs }}>{t("tapToPin")}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Collection Picker Modal ── */}
      <Modal animationType="slide" transparent visible={showCollectionPicker} onRequestClose={() => setShowCollectionPicker(false)}>
        <Pressable onPress={() => setShowCollectionPicker(false)} style={styles.modalOverlay}>
          <View style={[styles.dateModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t("selectCollection")}</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {/* New Collection option */}
              <Pressable
                onPress={() => {
                  setShowCollectionPicker(false);
                  router.push("/add-collection");
                }}
                style={[styles.modalOption, { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
              >
                <View style={styles.collectionPickerContent}>
                  <Ionicons name="add-circle" size={22} color={colors.primary} />
                  <Text style={[styles.modalOptionText, { color: colors.primary, fontWeight: "600" }]}>
                    {t("addCollection")}
                  </Text>
                </View>
              </Pressable>
              {collections.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setSelectedCollectionId(c.id);
                    setShowCollectionPicker(false);
                  }}
                  style={[
                    styles.modalOption,
                    selectedCollectionId === c.id && { backgroundColor: colors.primary + "15" },
                  ]}
                >
                  <View style={styles.collectionPickerContent}>
                    <Text style={{ fontSize: 20 }}>{c.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalOptionText, { color: selectedCollectionId === c.id ? colors.primary : colors.text }]}>
                        {c.name}
                      </Text>
                      <Text style={{ color: colors.muted, fontSize: fontSize.xs }}>
                        {c.item_count ?? 0} {t("items")}
                      </Text>
                    </View>
                  </View>
                  {selectedCollectionId === c.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ── Currency Modal ── */}
      <Modal animationType="slide" transparent visible={showCurrencyModal} onRequestClose={() => setShowCurrencyModal(false)}>
        <Pressable onPress={() => setShowCurrencyModal(false)} style={styles.modalOverlay}>
          <View style={[styles.dateModalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{t("currency")}</Text>
            {CURRENCIES.map((c) => (
              <Pressable
                key={c}
                onPress={() => { setCurrency(c); setShowCurrencyModal(false); }}
                style={[styles.modalOption, currency === c && { backgroundColor: colors.primary + "15" }]}
              >
                <Text style={[styles.modalOptionText, { color: currency === c ? colors.primary : colors.text }]}>{c}</Text>
                {currency === c && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  addPhotoBtn: {
    alignItems: "center", borderRadius: radius.lg, borderStyle: "dashed", borderWidth: 2,
    height: 100, justifyContent: "center", marginRight: spacing.sm, width: 100,
  },
  addPhotoText: { fontSize: fontSize.xs, fontWeight: "600", marginTop: 4 },
  badgeText: { fontSize: fontSize.sm, fontWeight: "600" },
  chip: { borderRadius: radius.sm, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.lg },
  chipText: { fontSize: fontSize.sm, fontWeight: "500" },
  col: { flex: 1 },
  collectionBadge: {
    alignItems: "center", alignSelf: "flex-start", borderRadius: radius.full,
    flexDirection: "row", gap: spacing.xs, marginBottom: spacing.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
  },
  collectionPickerBtn: {
    alignItems: "center", flexDirection: "row", justifyContent: "space-between",
  },
  collectionPickerContent: {
    alignItems: "center", flexDirection: "row", gap: spacing.sm,
  },
  collectionPickerText: {
    fontSize: fontSize.md, fontWeight: "500",
  },
  container: { flex: 1 },
  coverBadge: { borderRadius: radius.sm, bottom: 4, left: 4, paddingHorizontal: 6, paddingVertical: 2, position: "absolute" },
  coverText: { color: "#FFF", fontSize: 10, fontWeight: "700" },
  currencyTag: { alignItems: "center", flexDirection: "row", gap: 2, paddingHorizontal: spacing.md },
  currencyTagText: { fontSize: fontSize.md, fontWeight: "700" },
  dateBtn: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  dateModalBtn: { fontSize: fontSize.md, fontWeight: "600" },
  dateModalContent: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingBottom: 40, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  dateModalHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  datePicker: { height: 200, width: "100%" },
  mapHintOverlay: { alignItems: "center", bottom: 40, left: 0, position: "absolute", right: 0 },
  mapSearchOverlay: { left: 0, position: "absolute", right: 0, top: 0, zIndex: 10 },
  heading: { fontSize: fontSize.xl, fontWeight: "700" },
  input: { borderRadius: radius.md, fontSize: fontSize.md, marginBottom: spacing.md, padding: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: "600", marginBottom: spacing.sm, textTransform: "uppercase" },
  locationModalContainer: { flex: 1, paddingTop: 60 },
  locationModalHeader: { alignItems: "center", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: spacing.md, paddingHorizontal: spacing.lg },
  locationRow: { alignItems: "center", flexDirection: "row" },
  locationText: { flex: 1, fontSize: fontSize.md, marginLeft: spacing.sm },
  searchBarFloating: { marginTop: spacing.md, shadowColor: "#000", shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  searchHintBadge: { alignSelf: "center", borderRadius: radius.full, marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, shadowColor: "#000", shadowOffset: { height: 1, width: 0 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  miniMap: { borderRadius: radius.md, height: 120, width: "100%" },
  miniMapWrap: { borderRadius: radius.md, marginBottom: spacing.md, overflow: "hidden" },
  modalOption: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  modalOptionText: { fontSize: fontSize.md },
  modalOverlay: { backgroundColor: "rgba(0,0,0,0.5)", flex: 1, justifyContent: "flex-end" },
  modalTitle: { fontSize: fontSize.lg, fontWeight: "700" },
  photoRemove: { position: "absolute", right: -4, top: -4 },
  photoRow: { marginBottom: spacing.lg },
  photoThumb: { borderRadius: radius.md, height: 100, width: 100 },
  photoWrap: { marginRight: spacing.sm, position: "relative" },
  priceInput: { flex: 1, fontSize: fontSize.md, padding: spacing.md },
  priceRow: { borderRadius: radius.md, flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  ratingRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.lg },
  receiptBtn: {
    alignItems: "center", borderRadius: radius.lg, borderStyle: "dashed", borderWidth: 2,
    flexDirection: "row", gap: spacing.sm, justifyContent: "center",
    marginBottom: spacing.lg, paddingVertical: spacing.lg,
  },
  receiptBtnText: { fontSize: fontSize.sm, fontWeight: "600" },
  receiptThumb: { borderRadius: radius.md, height: 120, marginBottom: spacing.lg, width: "100%" },
  receiptWrap: { marginBottom: spacing.lg, position: "relative" },
  saveBtn: { marginBottom: 40, marginTop: spacing.lg },
  scroll: { padding: spacing.lg },
  searchBarInput: { flex: 1, fontSize: fontSize.md, marginLeft: spacing.sm, paddingVertical: spacing.sm },
  searchBarWrap: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", marginHorizontal: spacing.lg, marginTop: spacing.md, paddingHorizontal: spacing.md },
  searchResultItem: { alignItems: "flex-start", flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  searchResultText: { flex: 1, fontSize: fontSize.sm, lineHeight: 20 },
  searchResultsList: { borderRadius: radius.md, marginHorizontal: spacing.lg, marginTop: spacing.xs, maxHeight: 300, shadowColor: "#000", shadowOffset: { height: 2, width: 0 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  textArea: { height: 100, textAlignVertical: "top" },
  topBar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.lg, paddingTop: spacing.md },
  twoCol: { flexDirection: "row", gap: spacing.md },
});
