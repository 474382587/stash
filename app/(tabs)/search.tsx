import * as React from "react";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { useTranslation } from "react-i18next";
import {
  FlatList,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import EmptyState from "src/components/EmptyState";
import ItemCard from "src/components/ItemCard";
import { fontSize, radius, spacing, useTheme } from "src/theme";
import * as api from "src/services/api";
import type { Item } from "src/services/api";

export default function SearchScreen() {
  const { t } = useTranslation();
  const colors = useTheme();
  const posthog = usePostHog();
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<Item[]>([]);
  const [searched, setSearched] = React.useState(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleSearch(text: string) {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!text.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const items = await api.searchItems(text.trim());
        setResults(items);
        setSearched(true);
        posthog.capture("search_performed", { result_count: items.length });
      } catch {
        setResults([]);
        setSearched(true);
      }
    }, 300);
  }

  function renderItem({ item }: { item: Item }) {
    return (
      <ItemCard
        item={item}
        onPress={() => router.push(`/item/${item.id}`)}
      />
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          autoFocus
          clearButtonMode="while-editing"
          onChangeText={handleSearch}
          placeholder={t("searchPlaceholder")}
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={[styles.searchInput, { color: colors.text }]}
          value={query}
        />
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          searched ? (
            <EmptyState
              icon="🔍"
              message={t("emptySearchMsg", { query })}
              title={t("emptySearch")}
            />
          ) : (
            <EmptyState
              icon="🔍"
              message={t("searchTitleMsg")}
              title={t("searchTitle")}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
  row: {
    justifyContent: "space-between",
  },
  searchBar: {
    alignItems: "center",
    borderRadius: radius.md,
    flexDirection: "row",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: fontSize.md,
    paddingVertical: spacing.md,
  },
});
