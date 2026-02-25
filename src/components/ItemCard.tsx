import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatMoney } from "src/lib/format";
import { fontSize, radius, spacing, useTheme } from "src/theme";
import type { Item, ViewMode } from "src/services/api";

const STATUS_COLORS: Record<string, string> = {
  owned: "#22C55E",
  sold: "#9CA3AF",
  traded: "#F59E0B",
  wishlist: "#818CF8",
};

interface Props {
  item: Item;
  onLongPress?: () => void;
  onPress: () => void;
  viewMode?: ViewMode;
}

function ItemCard({ item, onLongPress, onPress, viewMode = "grid" }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();
  const isLarge = viewMode === "large";
  const statusColor = STATUS_COLORS[item.status] ?? STATUS_COLORS.owned;
  const showStatus = item.status !== "owned";

  return (
    <Pressable
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isLarge && styles.cardLarge,
        { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      {item.cover_photo ? (
        <Image
          source={{ uri: item.cover_photo }}
          style={isLarge ? styles.imageLarge : styles.image}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View
          style={[
            isLarge ? styles.imageLarge : styles.image,
            styles.placeholder,
            { backgroundColor: colors.cardAlt },
          ]}
        >
          <Text style={styles.placeholderIcon}>📷</Text>
        </View>
      )}

      {showStatus && (
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor + "DD" },
          ]}
        >
          <Text style={styles.statusText}>{t(item.status)}</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        {item.brand && (
          <Text style={[styles.brand, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.brand}
          </Text>
        )}
        {(item.purchase_price != null || item.current_value != null) && (
          <Text style={[styles.price, { color: colors.primary }]}>
            {formatMoney(item.current_value ?? item.purchase_price, item.currency)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  brand: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  card: {
    borderRadius: radius.lg,
    flex: 1,
    margin: spacing.xs,
    overflow: "hidden",
  },
  cardLarge: {
    margin: 0,
    marginBottom: spacing.md,
  },
  image: {
    aspectRatio: 1,
    width: "100%",
  },
  imageLarge: {
    aspectRatio: 4 / 3,
    width: "100%",
  },
  info: {
    padding: spacing.sm,
  },
  name: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIcon: {
    fontSize: 32,
    opacity: 0.4,
  },
  price: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    position: "absolute",
    right: 8,
    top: 8,
  },
  statusText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
});

export default ItemCard;
