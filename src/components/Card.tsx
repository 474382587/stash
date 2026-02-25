import { StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";

import { radius, spacing } from "src/theme";
import { useTheme } from "src/theme";

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
}

function Card({ children, style }: Props) {
  const colors = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
});

export default Card;
