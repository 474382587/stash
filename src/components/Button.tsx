import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import type { ViewStyle } from "react-native";

import { fontSize, radius, spacing } from "src/theme";
import { useTheme } from "src/theme";

interface Props {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  variant?: "danger" | "outline" | "primary" | "secondary";
}

function Button({
  disabled,
  label,
  loading,
  onPress,
  style,
  variant = "primary",
}: Props) {
  const colors = useTheme();

  const bgMap = {
    danger: colors.danger,
    outline: "transparent",
    primary: colors.primary,
    secondary: colors.cardAlt,
  };

  const textMap = {
    danger: "#FFF",
    outline: colors.primary,
    primary: "#FFF",
    secondary: colors.text,
  };

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bgMap[variant],
          borderColor: variant === "outline" ? colors.primary : "transparent",
          borderWidth: variant === "outline" ? 1.5 : 0,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textMap[variant]} size="small" />
      ) : (
        <Text style={[styles.label, { color: textMap[variant] }]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    borderRadius: radius.md,
    height: 48,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  label: {
    fontSize: fontSize.md,
    fontWeight: "600",
  },
});

export default Button;
