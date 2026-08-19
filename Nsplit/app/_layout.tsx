import "react-native-gesture-handler";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { useColors } from "@/hooks/use-colors";
import { AuthProvider } from "@/src/auth/auth-context";
import { IdentityProvider } from "@/src/identity/identity-context";
import { GroupsProvider, useGroups } from "@/src/groups/groups-context";

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: "(tabs)",
};

function BootSplash() {
  const colors = useColors();
  return (
    <View style={[styles.splash, { backgroundColor: colors.background }]}>
      <Text style={[styles.brand, { color: colors.primary }]}>nSplit</Text>
      <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
    </View>
  );
}

function RootNavigator() {
  const colorScheme = useColorScheme();
  const colors = useColors();
  const { ready } = useGroups();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  if (!ready) return <BootSplash />;

  const baseTheme = colorScheme === "dark" ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      background: colors.background,
      card: colors.background,
    },
  };

  return (
    <ThemeProvider value={navTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: "slide_from_right",
          presentation: "card",
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="group" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <IdentityProvider>
        <GroupsProvider>
          <RootNavigator />
        </GroupsProvider>
      </IdentityProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  brand: {
    fontSize: 32,
    fontWeight: "700",
  },
});
