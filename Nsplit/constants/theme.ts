/**
 * Nsplit Indigo design tokens - aligned with web CSS variables.
 */
import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F172A',
    textSecondary: '#64748B',
    background: '#F3F4F6',
    surface: '#FFFFFF',
    softSurface: '#E5E7EB',
    border: '#E2E8F0',
    tint: '#6366F1',
    primary: '#6366F1',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#F43F5E',
    icon: '#64748B',
    tabIconDefault: '#64748B',
    tabIconSelected: '#6366F1',
  },
  dark: {
    text: '#F8FAFC',
    textSecondary: '#94A3B8',
    background: '#0B1020',
    surface: '#111827',
    softSurface: '#182033',
    border: '#263247',
    tint: '#818CF8',
    primary: '#818CF8',
    success: '#34D399',
    warning: '#F59E0B',
    danger: '#F43F5E',
    icon: '#94A3B8',
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#818CF8',
  },
};

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
