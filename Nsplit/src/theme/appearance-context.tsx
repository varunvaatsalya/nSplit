import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Appearance, useColorScheme as useSystemColorScheme, View } from 'react-native';
import { vars, useColorScheme as useNativewindColorScheme } from 'nativewind';

import {
  getThemeColors,
  type AppearanceMode,
  type ColorSchemeName,
  type ColorThemeId,
  type ColorTokens,
} from '@/constants/theme';
import { getNativewindVars } from '@/lib/theme';
import {
  getAppearanceSettings,
  setAppearanceMode as persistMode,
  setColorTheme as persistColorTheme,
} from '@/src/db/settings';

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

function applyNativeScheme(mode: AppearanceMode) {
  try {
    Appearance.setColorScheme(mode === 'system' ? null : mode);
  } catch {
    // Some web/runtime builds don't implement this.
  }
}

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const systemScheme = useSystemColorScheme();
  const { setColorScheme } = useNativewindColorScheme();
  const [ready, setReady] = useState(false);
  const [mode, setModeState] = useState<AppearanceMode>('system');
  const [colorTheme, setColorThemeState] = useState<ColorThemeId>('indigo');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await getAppearanceSettings();
        if (cancelled) return;
        setModeState(stored.mode);
        setColorThemeState(stored.colorTheme);
        applyNativeScheme(stored.mode);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scheme: ColorSchemeName =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  useEffect(() => {
    setColorScheme(scheme);
  }, [scheme, setColorScheme]);

  const colors = useMemo(() => getThemeColors(colorTheme, scheme), [colorTheme, scheme]);
  const cssVars = useMemo(() => vars(getNativewindVars(colorTheme, scheme)), [colorTheme, scheme]);

  const setMode = useCallback(async (next: AppearanceMode) => {
    setModeState(next);
    applyNativeScheme(next);
    await persistMode(next);
  }, []);

  const setColorTheme = useCallback(async (next: ColorThemeId) => {
    setColorThemeState(next);
    await persistColorTheme(next);
  }, []);

  const value = useMemo(
    () => ({ ready, mode, colorTheme, scheme, colors, setMode, setColorTheme }),
    [ready, mode, colorTheme, scheme, colors, setMode, setColorTheme]
  );

  return (
    <AppearanceContext.Provider value={value}>
      <View style={[{ flex: 1 }, cssVars]}>{children}</View>
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext);
  if (!ctx) throw new Error('useAppearance must be used within AppearanceProvider');
  return ctx;
}

export function useAppearanceOptional() {
  return useContext(AppearanceContext);
}
