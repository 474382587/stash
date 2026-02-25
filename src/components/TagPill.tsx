import { Pressable, StyleSheet, Text } from "react-native";

import { fontSize, radius, spacing } from "src/theme";

interface Props {
  color: string;
  label: string;
  onPress?: () => void;
  selected?: boolean;
}

function TagPill({ color, label, onPress, selected }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.pill,
        {
          backgroundColor: selected ? color : color + "20",
          borderColor: color,
          borderWidth: selected ? 0 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: selected ? "#FFF" : color },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
  pill: {
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
});

export default TagPill;
