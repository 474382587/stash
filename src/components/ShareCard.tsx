import * as React from "react";

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { formatCondition, formatDate, formatMoney } from "src/lib/format";
import type { Item, Tag } from "src/services/api";

import appIcon from "../../assets/icon.png";

interface Props {
  collectionName?: string;
  item: Item;
  photoUri?: string | null;
  tags?: Tag[];
}

function ShareCard({ collectionName, item, photoUri, tags }: Props, ref: React.Ref<View>) {
  const { t } = useTranslation();

  const details: { label: string; value: string }[] = [];

  if (item.brand) {
    details.push({ label: t("brand"), value: item.brand + (item.model ? ` · ${item.model}` : "") });
  } else if (item.model) {
    details.push({ label: t("model"), value: item.model });
  }

  if (item.purchase_price != null) {
    details.push({ label: t("price"), value: formatMoney(item.purchase_price, item.currency) });
  }

  if (item.condition) {
    details.push({ label: t("condition"), value: formatCondition(item.condition) });
  }

  if (item.purchase_date) {
    details.push({ label: t("purchaseDate"), value: formatDate(item.purchase_date) });
  }

  if (item.store_name) {
    details.push({ label: t("storeName"), value: item.store_name });
  }

  if (item.purchase_location) {
    details.push({ label: t("location"), value: item.purchase_location });
  }

  const stars = item.rating != null && item.rating > 0 ? item.rating : 0;

  return (
    <View ref={ref} style={styles.card} collapsable={false}>
      {/* Photo */}
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
      ) : (
        <View style={styles.noPhoto}>
          <Text style={styles.noPhotoIcon}>📸</Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Name */}
        <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>

        {/* Rating */}
        {stars > 0 && (
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Ionicons
                key={s}
                name={s <= stars ? "star" : "star-outline"}
                size={16}
                color={s <= stars ? "#F59E0B" : "#D1D5DB"}
              />
            ))}
          </View>
        )}

        {/* Divider */}
        <View style={styles.divider} />

        {/* Details */}
        {details.map((d) => (
          <View key={d.label} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{d.label}</Text>
            <Text style={styles.detailValue} numberOfLines={1}>{d.value}</Text>
          </View>
        ))}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <View style={styles.tagsRow}>
            {tags.map((tag) => (
              <View key={tag.id} style={[styles.tagPill, { backgroundColor: tag.color + "20" }]}>
                <View style={[styles.tagDot, { backgroundColor: tag.color }]} />
                <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {item.notes ? (
          <Text style={styles.notes} numberOfLines={3}>"{item.notes}"</Text>
        ) : null}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <Image source={appIcon} style={styles.appIcon} contentFit="cover" />
            <Text style={styles.brandingText}>stash</Text>
            <View style={styles.brandingDot} />
          </View>
          {collectionName ? (
            <Text style={styles.collectionText} numberOfLines={1}>{collectionName}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default React.forwardRef(ShareCard);

const styles = StyleSheet.create({
  appIcon: {
    borderRadius: 6,
    height: 24,
    width: 24,
  },
  brandingDot: {
    backgroundColor: "#A78BFA",
    borderRadius: 2.5,
    height: 5,
    marginBottom: 2,
    marginLeft: 1,
    width: 5,
  },
  brandingText: {
    color: "#6C63FF",
    fontFamily: "Inter_900Black",
    fontSize: 15,
    letterSpacing: -0.3,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    overflow: "hidden",
    width: 340,
  },
  collectionText: {
    color: "#9CA3AF",
    fontSize: 11,
    maxWidth: 160,
  },
  content: {
    padding: 20,
  },
  detailLabel: {
    color: "#9CA3AF",
    fontSize: 12,
    fontWeight: "500",
    width: 72,
  },
  detailRow: {
    alignItems: "center",
    flexDirection: "row",
    paddingVertical: 5,
  },
  detailValue: {
    color: "#374151",
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },
  divider: {
    backgroundColor: "#F3F4F6",
    height: 1,
    marginVertical: 14,
  },
  footer: {
    alignItems: "center",
    borderTopColor: "#F3F4F6",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    paddingTop: 14,
  },
  footerLeft: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 6,
  },
  itemName: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  noPhoto: {
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    height: 240,
    justifyContent: "center",
  },
  noPhotoIcon: {
    fontSize: 48,
  },
  notes: {
    color: "#6B7280",
    fontSize: 13,
    fontStyle: "italic",
    lineHeight: 20,
    marginTop: 12,
  },
  photo: {
    height: 340,
    width: "100%",
  },
  ratingRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 8,
  },
  tagDot: {
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  tagPill: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  tagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
});
