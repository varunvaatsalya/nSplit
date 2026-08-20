/**
 * App color tokens. Accent palettes keep surfaces consistent and only shift
 * primary / tint / a light background wash.
 */
import { Platform } from 'react-native';

export type ColorSchemeName = 'light' | 'dark';
export type AppearanceMode = 'system' | 'light' | 'dark';
export type ColorThemeId = 'indigo' | 'teal' | 'violet' | 'amber';

export type ColorTokens = {
  text: string;
  textSecondary: string;
  background: string;
  surface: string;
  elevated: string;
  softSurface: string;
  border: string;
  overlay: string;
  tint: string;
  primary: string;
  primaryForeground: string;
  success: string;
  warning: string;
  danger: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
};

type Palette = Record<ColorSchemeName, ColorTokens>;

const LIGHT_BASE = {
  text: '#0F172A',
  textSecondary: '#64748B',
  surface: '#FFFFFF',
  elevated: '#FFFFFF',
  overlay: 'rgba(15, 23, 42, 0.5)',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#F43F5E',
  icon: '#64748B',
  tabIconDefault: '#64748B',
} as const;

const DARK_BASE = {
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  overlay: 'rgba(0, 0, 0, 0.72)',
  success: '#34D399',
  warning: '#F59E0B',
  danger: '#F43F5E',
  icon: '#94A3B8',
  tabIconDefault: '#94A3B8',
} as const;

export const COLOR_THEMES: {
  id: ColorThemeId;
  label: string;
  swatch: string;
}[] = [
  { id: 'indigo', label: 'Indigo', swatch: '#6366F1' },
  { id: 'teal', label: 'Teal', swatch: '#14B8A6' },
  { id: 'violet', label: 'Violet', swatch: '#7C3AED' },
  { id: 'amber', label: 'Amber', swatch: '#D97706' },
];

export const THEME_PALETTES: Record<ColorThemeId, Palette> = {
  indigo: {
    light: {
      ...LIGHT_BASE,
      background: '#F3F4F6',
      softSurface: '#E5E7EB',
      border: '#E2E8F0',
      tint: '#6366F1',
      primary: '#6366F1',
      primaryForeground: '#FFFFFF',
      tabIconSelected: '#6366F1',
    },
    dark: {
      ...DARK_BASE,
      background: '#0B1020',
      surface: '#111827',
      elevated: '#1E293B',
      softSurface: '#243044',
      border: '#334155',
      tint: '#818CF8',
      primary: '#818CF8',
      primaryForeground: '#0B1020',
      tabIconSelected: '#818CF8',
    },
  },
  teal: {
    light: {
      ...LIGHT_BASE,
      background: '#F0F7F6',
      softSurface: '#D7EBE8',
      border: '#D0E3DF',
      tint: '#0D9488',
      primary: '#0D9488',
      primaryForeground: '#FFFFFF',
      tabIconSelected: '#0D9488',
    },
    dark: {
      ...DARK_BASE,
      background: '#071412',
      surface: '#0F1F1C',
      elevated: '#16302B',
      softSurface: '#1A3A34',
      border: '#2A4A44',
      tint: '#2DD4BF',
      primary: '#2DD4BF',
      primaryForeground: '#071412',
      tabIconSelected: '#2DD4BF',
    },
  },
  violet: {
    light: {
      ...LIGHT_BASE,
      background: '#F5F3F8',
      softSurface: '#E4DDF2',
      border: '#DDD6EC',
      tint: '#7C3AED',
      primary: '#7C3AED',
      primaryForeground: '#FFFFFF',
      tabIconSelected: '#7C3AED',
    },
    dark: {
      ...DARK_BASE,
      background: '#0F0B1A',
      surface: '#161225',
      elevated: '#221C38',
      softSurface: '#2A2444',
      border: '#3D3560',
      tint: '#A78BFA',
      primary: '#A78BFA',
      primaryForeground: '#0F0B1A',
      tabIconSelected: '#A78BFA',
    },
  },
  amber: {
    light: {
      ...LIGHT_BASE,
      background: '#F7F4F0',
      softSurface: '#EDE3D4',
      border: '#E8DCCB',
      tint: '#D97706',
      primary: '#D97706',
      primaryForeground: '#FFFFFF',
      tabIconSelected: '#D97706',
    },
    dark: {
      ...DARK_BASE,
      background: '#140F08',
      surface: '#1C160C',
      elevated: '#2A2010',
      softSurface: '#332818',
      border: '#4A3A20',
      tint: '#FBBF24',
      primary: '#FBBF24',
      primaryForeground: '#140F08',
      tabIconSelected: '#FBBF24',
    },
  },
};

/** Default indigo palette, kept for any leftover `Colors.light` / `Colors.dark` reads. */
export const Colors = THEME_PALETTES.indigo;

export function getThemeColors(themeId: ColorThemeId, scheme: ColorSchemeName): ColorTokens {
  return THEME_PALETTES[themeId][scheme];
}

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
