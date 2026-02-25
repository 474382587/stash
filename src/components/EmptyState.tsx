import { StyleSheet, Text, View } from "react-native";

import { fontSize, spacing } from "src/theme";
import { useTheme } from "src/theme";

interface Props {
  action?: React.ReactNode;
  icon: string;
  message: string;
  title: string;
}

function EmptyState({ action, icon, message, title }: Props) {
  const colors = useTheme();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.message, { color: colors.textSecondary }]}>
        {message}
      </Text>
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: spacing.lg,
  },
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: 80,
  },
  icon: {
    fontSize: 56,
    marginBottom: spacing.lg,
  },
  message: {
    fontSize: fontSize.md,
    lineHeight: 22,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: "700",
  },
});

export default EmptyState;
