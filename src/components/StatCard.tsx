import { StyleSheet, Text, View } from "react-native";

import { fontSize, radius, spacing } from "src/theme";
import { useTheme } from "src/theme";

interface Props {
  color?: string;
  icon: string;
  label: string;
  value: string;
}

function StatCard({ color, icon, label, value }: Props) {
  const colors = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card }]}>
      <View
        style={[
          styles.iconWrap,
          { backgroundColor: (color ?? colors.primary) + "20" },
        ]}
      >
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text
        style={[styles.value, { color: colors.text }]}
        numberOfLines={1}
      >
        {value}
      </Text>
      <Text
        style={[styles.label, { color: colors.textSecondary }]}
        adjustsFontSizeToFit
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    flex: 1,
    padding: spacing.md,
  },
  icon: {
    fontSize: 18,
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: radius.sm,
    height: 32,
    justifyContent: "center",
    marginBottom: spacing.sm,
    width: 32,
  },
  label: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  value: {
    fontSize: fontSize.lg,
    fontWeight: "700",
  },
});

export default StatCard;
