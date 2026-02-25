import * as React from "react";

import { useFonts, Inter_900Black } from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { PostHogProvider } from "posthog-react-native";
import { useTranslation } from "react-i18next";
import { useColorScheme } from "react-native";

import "src/i18n";
import { loadPersistedLanguage } from "src/i18n";
import { dark, light } from "src/theme/colors";
import { useCollections } from "src/store/useCollections";
import { useSettings } from "src/store/useSettings";
import { useTags } from "src/store/useTags";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? dark : light;
  const loadCollections = useCollections((s) => s.load);
  const loadSettings = useSettings((s) => s.load);
  const loadTags = useTags((s) => s.load);

  const [fontsLoaded] = useFonts({ Inter_900Black });

  React.useEffect(() => {
    loadPersistedLanguage().catch(() => {});
    loadCollections().catch(() => {});
    loadSettings().catch(() => {});
    loadTags().catch(() => {});
  }, []);

  React.useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <PostHogProvider
      apiKey="phc_CCmsii6XtAEyrvVkcSbPCdgL6DVdyO1nnPToBW5nuFP"
      options={{
        host: "https://us.i.posthog.com",
      }}
    >
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="collection/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="item/[id]"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="add-collection"
          options={{
            headerTitle: t("addCollection"),
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="add-item"
          options={{
            headerTitle: t("addItem"),
            presentation: "modal",
          }}
        />
        <Stack.Screen
          name="edit-collection"
          options={{
            headerTitle: t("editCollection"),
            presentation: "modal",
          }}
        />
      </Stack>
    </PostHogProvider>
  );
}
