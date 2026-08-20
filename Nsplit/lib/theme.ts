import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

import type { ColorSchemeName, ColorThemeId, ColorTokens } from '@/constants/theme';

type HslTheme = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  border: string;
  input: string;
  ring: string;
};

const LIGHT_HSL = {
  foreground: '222 47% 11%',
  card: '0 0% 100%',
  cardForeground: '222 47% 11%',
  popover: '0 0% 100%',
  popoverForeground: '222 47% 11%',
  primaryForeground: '0 0% 100%',
  secondary: '220 13% 91%',
  secondaryForeground: '222 47% 11%',
  muted: '220 13% 91%',
  mutedForeground: '215 16% 47%',
  accent: '220 13% 91%',
  accentForeground: '222 47% 11%',
  destructive: '350 89% 60%',
  border: '214 32% 91%',
  input: '214 32% 91%',
} as const;

const DARK_HSL = {
  foreground: '210 40% 98%',
  cardForeground: '210 40% 98%',
  popoverForeground: '210 40% 98%',
  secondary: '217 33% 17%',
  secondaryForeground: '210 40% 98%',
  muted: '217 33% 17%',
  mutedForeground: '215 16% 65%',
  accent: '217 33% 17%',
  accentForeground: '210 40% 98%',
  destructive: '350 89% 60%',
  border: '215 25% 27%',
  input: '215 25% 27%',
} as const;

const THEME_HSL: Record<ColorThemeId, Record<ColorSchemeName, HslTheme>> = {
  indigo: {
    light: {
      ...LIGHT_HSL,
      background: '220 14% 96%',
      primary: '239 84% 67%',
      ring: '239 84% 67%',
    },
    dark: {
      ...DARK_HSL,
      background: '226 49% 8%',
      card: '222 47% 11%',
      popover: '222 47% 11%',
      primary: '234 89% 74%',
      primaryForeground: '226 49% 8%',
      ring: '234 89% 74%',
    },
  },
  teal: {
    light: {
      ...LIGHT_HSL,
      background: '174 29% 96%',
      primary: '175 84% 32%',
      ring: '175 84% 32%',
    },
    dark: {
      ...DARK_HSL,
      background: '170 40% 5%',
      card: '168 33% 9%',
      popover: '168 33% 9%',
      primary: '172 66% 50%',
      primaryForeground: '170 40% 5%',
      ring: '172 66% 50%',
    },
  },
  violet: {
    light: {
      ...LIGHT_HSL,
      background: '260 25% 97%',
      primary: '263 70% 50%',
      ring: '263 70% 50%',
    },
    dark: {
      ...DARK_HSL,
      background: '255 40% 7%',
      card: '255 35% 11%',
      popover: '255 35% 11%',
      primary: '255 92% 76%',
      primaryForeground: '255 40% 7%',
      ring: '255 92% 76%',
    },
  },
  amber: {
    light: {
      ...LIGHT_HSL,
      background: '36 33% 96%',
      primary: '32 95% 44%',
      ring: '32 95% 44%',
    },
    dark: {
      ...DARK_HSL,
      background: '33 43% 5%',
      card: '36 38% 8%',
      popover: '36 38% 8%',
      primary: '43 96% 56%',
      primaryForeground: '33 43% 5%',
      ring: '43 96% 56%',
    },
  },
};

export const THEME = {
  light: hslThemeToCss(THEME_HSL.indigo.light),
  dark: hslThemeToCss(THEME_HSL.indigo.dark),
};

function hslThemeToCss(theme: HslTheme) {
  return {
    background: `hsl(${theme.background})`,
    foreground: `hsl(${theme.foreground})`,
    card: `hsl(${theme.card})`,
    cardForeground: `hsl(${theme.cardForeground})`,
    popover: `hsl(${theme.popover})`,
    popoverForeground: `hsl(${theme.popoverForeground})`,
    primary: `hsl(${theme.primary})`,
    primaryForeground: `hsl(${theme.primaryForeground})`,
    secondary: `hsl(${theme.secondary})`,
    secondaryForeground: `hsl(${theme.secondaryForeground})`,
    muted: `hsl(${theme.muted})`,
    mutedForeground: `hsl(${theme.mutedForeground})`,
    accent: `hsl(${theme.accent})`,
    accentForeground: `hsl(${theme.accentForeground})`,
    destructive: `hsl(${theme.destructive})`,
    border: `hsl(${theme.border})`,
    input: `hsl(${theme.input})`,
    ring: `hsl(${theme.ring})`,
    radius: '0.625rem',
  };
}

export function getNativewindVars(themeId: ColorThemeId, scheme: ColorSchemeName) {
  const theme = THEME_HSL[themeId][scheme];
  return {
    '--background': theme.background,
    '--foreground': theme.foreground,
    '--card': theme.card,
    '--card-foreground': theme.cardForeground,
    '--popover': theme.popover,
    '--popover-foreground': theme.popoverForeground,
    '--primary': theme.primary,
    '--primary-foreground': theme.primaryForeground,
    '--secondary': theme.secondary,
    '--secondary-foreground': theme.secondaryForeground,
    '--muted': theme.muted,
    '--muted-foreground': theme.mutedForeground,
    '--accent': theme.accent,
    '--accent-foreground': theme.accentForeground,
    '--destructive': theme.destructive,
    '--border': theme.border,
    '--input': theme.input,
    '--ring': theme.ring,
  };
}

export function getNavTheme(scheme: ColorSchemeName, colors: ColorTokens): Theme {
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.background,
      border: colors.border,
      primary: colors.primary,
      text: colors.text,
      notification: colors.danger,
    },
  };
}

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: THEME.light.background,
      border: THEME.light.border,
      card: THEME.light.card,
      notification: THEME.light.destructive,
      primary: THEME.light.primary,
      text: THEME.light.foreground,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: THEME.dark.background,
      border: THEME.dark.border,
      card: THEME.dark.card,
      notification: THEME.dark.destructive,
      primary: THEME.dark.primary,
      text: THEME.dark.foreground,
    },
  },
};
