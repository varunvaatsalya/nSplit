import "react-native-gesture-handler";
import "@/global.css";
import { ThemeProvider } from "@react-navigation/native";
import { PortalHost } from "@rn-primitives/portal";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import "react-native-reanimated";

import { NsplitBrand } from "@/components/nsplit-logo";
import { useColors } from "@/hooks/use-colors";
import { getNavTheme } from "@/lib/theme";
import { AuthProvider } from "@/src/auth/auth-context";
import { GroupsProvider, useGroups } from "@/src/groups/groups-context";
import { IdentityProvider } from "@/src/identity/identity-context";
import { OfflineProvider } from "@/src/offline/offline-context";
import { AppearanceProvider, useAppearance } from "@/src/theme/appearance-context";

SplashScreen.preventAutoHideAsync().catch(() => {});

export const unstable_settings = {
  anchor: "(tabs)",
};

function BootSplash() {
  const colors = useColors();
  return (
    <View style={[styles.splash, { backgroundColor: colors.background }]}>
      <NsplitBrand color={colors.primary} logoSize={44} fontSize={36} align="center" />
      <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
    </View>
  );
}

function RootNavigator() {
  const { ready: appearanceReady, scheme } = useAppearance();
  const colors = useColors();
  const { ready } = useGroups();

  useEffect(() => {
    if (ready && appearanceReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready, appearanceReady]);

  if (!ready || !appearanceReady) return <BootSplash />;

  return (
    <ThemeProvider value={getNavTheme(scheme, colors)}>
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
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <PortalHost />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <OfflineProvider>
        <AuthProvider>
          <IdentityProvider>
            <GroupsProvider>
              <RootNavigator />
            </GroupsProvider>
          </IdentityProvider>
        </AuthProvider>
      </OfflineProvider>
    </AppearanceProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
