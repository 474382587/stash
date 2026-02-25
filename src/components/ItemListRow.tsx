import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { formatCondition, formatMoney } from "src/lib/format";
import { fontSize, radius, spacing, useTheme } from "src/theme";
import type { Item } from "src/services/api";

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
}

function ItemListRow({ item, onLongPress, onPress }: Props) {
  const colors = useTheme();
  const { t } = useTranslation();
  const statusColor = STATUS_COLORS[item.status] ?? STATUS_COLORS.owned;

  return (
    <Pressable
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      {item.cover_photo ? (
        <Image
          source={{ uri: item.cover_photo }}
          style={styles.thumb}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.thumb, styles.noThumb, { backgroundColor: colors.cardAlt }]}>
          <Text style={{ fontSize: 20, opacity: 0.4 }}>📷</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        {item.brand && (
          <Text style={[styles.sub, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.brand}{item.model ? ` · ${item.model}` : ""}
          </Text>
        )}
        <View style={styles.metaRow}>
          {item.condition && (
            <Text style={[styles.metaText, { color: colors.muted }]}>
              {formatCondition(item.condition, t)}
            </Text>
          )}
          {item.rating != null && item.rating > 0 && (
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= (item.rating ?? 0) ? "star" : "star-outline"}
                  size={12}
                  color={s <= (item.rating ?? 0) ? "#F59E0B" : colors.muted}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      <View style={styles.right}>
        {(item.purchase_price != null || item.current_value != null) && (
          <Text style={[styles.price, { color: colors.primary }]}>
            {formatMoney(item.current_value ?? item.purchase_price, item.currency)}
          </Text>
        )}
        <View style={[styles.statusBadge, { backgroundColor: statusColor + "20" }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {t(item.status)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  info: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: 2,
  },
  metaText: {
    fontSize: fontSize.xs,
  },
  name: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  noThumb: {
    alignItems: "center",
    justifyContent: "center",
  },
  price: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    textAlign: "right",
  },
  right: {
    alignItems: "flex-end",
    justifyContent: "center",
    paddingRight: spacing.md,
  },
  row: {
    borderRadius: radius.lg,
    flexDirection: "row",
    marginBottom: spacing.sm,
    overflow: "hidden",
  },
  starsRow: {
    flexDirection: "row",
    gap: 1,
  },
  statusBadge: {
    borderRadius: radius.sm,
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  sub: {
    fontSize: fontSize.xs,
    marginTop: 1,
  },
  thumb: {
    height: 72,
    width: 72,
  },
});

export default ItemListRow;
