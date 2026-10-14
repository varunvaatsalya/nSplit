import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Appearance,
  useColorScheme as useSystemColorScheme,
  View,
} from "react-native";
import { vars, useColorScheme as useNativewindColorScheme } from "nativewind";

import {
  getThemeColors,
  type AppearanceMode,
  type ColorSchemeName,
  type ColorThemeId,
  type ColorTokens,
} from "@/constants/theme";

import { getNativewindVars } from "@/lib/theme";

import {
  getAppearanceSettings,
  setAppearanceMode as persistMode,
  setColorTheme as persistColorTheme,
} from "@/src/db/settings";

type AppearanceContextValue = {
  ready: boolean;
  mode: AppearanceMode;
  colorTheme: ColorThemeId;
  scheme: ColorSchemeName;
  colors: ColorTokens;
  setMode: (mode: AppearanceMode) => Promise<void>;
  setColorTheme: (themeId: ColorThemeId) => Promise<void>;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  /**
   * React Native's live system color scheme.
   *
   * This value changes when the user changes the device's
   * Light/Dark appearance while the app is running.
   */
  const systemScheme = useSystemColorScheme();

  /**
   * NativeWind's color scheme controller.
   *
   * We keep NativeWind synchronized with the resolved scheme
   * calculated below.
   */
  const { setColorScheme } = useNativewindColorScheme();

  const [ready, setReady] = useState(false);

  const [mode, setModeState] = useState<AppearanceMode>("system");

  const [colorTheme, setColorThemeState] = useState<ColorThemeId>("indigo");

  /**
   * Load the user's saved appearance settings.
   */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stored = await getAppearanceSettings();

        if (cancelled) return;

        setModeState(stored.mode);
        setColorThemeState(stored.colorTheme);
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Resolve the actual Light/Dark scheme used by the app.
   *
   * - System → follows the device
   * - Light  → always light
   * - Dark   → always dark
   */
  const scheme: ColorSchemeName =
    mode === "system" ? (systemScheme === "dark" ? "dark" : "light") : mode;

  /**
   * Keep NativeWind synchronized with the selected mode.
   *
   * NativeWind forwards this to Appearance.setColorScheme, which overrides
   * the app-wide scheme (and therefore useSystemColorScheme above). In
   * System mode we must pass "system" to clear that override; passing the
   * resolved scheme would pin the app to whatever was last forced.
   */
  useEffect(() => {
    setColorScheme(mode);
  }, [mode, setColorScheme]);

  /**
   * Resolve the complete color palette.
   */
  const colors = useMemo(
    () => getThemeColors(colorTheme, scheme),
    [colorTheme, scheme],
  );

  /**
   * Resolve NativeWind CSS variables using the exact same
   * color theme + Light/Dark scheme.
   */
  const cssVars = useMemo(
    () => vars(getNativewindVars(colorTheme, scheme)),
    [colorTheme, scheme],
  );

  /**
   * Change Light / Dark / System mode.
   */
  const setMode = useCallback(async (next: AppearanceMode) => {
    setModeState(next);
    await persistMode(next);
  }, []);

  /**
   * Change the accent color theme.
   */
  const setColorTheme = useCallback(async (next: ColorThemeId) => {
    setColorThemeState(next);
    await persistColorTheme(next);
  }, []);

  const value = useMemo(
    () => ({
      ready,
      mode,
      colorTheme,
      scheme,
      colors,
      setMode,
      setColorTheme,
    }),
    [ready, mode, colorTheme, scheme, colors, setMode, setColorTheme],
  );

  return (
    <AppearanceContext.Provider value={value}>
      <View style={[{ flex: 1 }, cssVars]}>{children}</View>
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);

  if (!ctx) {
    throw new Error("useAppearance must be used within AppearanceProvider");
  }

  return ctx;
}

export function useAppearanceOptional() {
  return useContext(AppearanceContext);
}
