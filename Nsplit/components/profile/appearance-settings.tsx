import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLOR_THEMES, type AppearanceMode, type ColorThemeId } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { useAppearance } from '@/src/theme/appearance-context';

const MODES: { id: AppearanceMode; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { id: 'system', label: 'System', icon: 'brightness-auto' },
  { id: 'light', label: 'Light', icon: 'light-mode' },
  { id: 'dark', label: 'Dark', icon: 'dark-mode' },
];

export function AppearanceSettings() {
  const colors = useColors();
  const { mode, colorTheme, setMode, setColorTheme } = useAppearance();

  async function onMode(next: AppearanceMode) {
    if (next === mode) return;
    Haptics.selectionAsync().catch(() => {});
    await setMode(next);
  }

  async function onTheme(next: ColorThemeId) {
    if (next === colorTheme) return;
    Haptics.selectionAsync().catch(() => {});
    await setColorTheme(next);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.section, { color: colors.text }]}>Appearance</Text>
      <Text style={[styles.hint, { color: colors.textSecondary }]}>
        Default follows this phone. You can lock light or dark, and pick a color theme.
      </Text>

      <View style={styles.modeRow}>
        {MODES.map((item) => {
          const selected = mode === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => onMode(item.id)}
              style={[
                styles.modeBtn,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primary : colors.background,
                },
              ]}>
              <MaterialIcons
                name={item.icon}
                size={20}
                color={selected ? colors.primaryForeground : colors.textSecondary}
              />
              <Text
                style={[
                  styles.modeLabel,
                  { color: selected ? colors.primaryForeground : colors.textSecondary },
                ]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.subhead, { color: colors.text }]}>Color theme</Text>
      <View style={styles.themeRow}>
        {COLOR_THEMES.map((theme) => {
          const selected = colorTheme === theme.id;
          return (
            <Pressable key={theme.id} onPress={() => onTheme(theme.id)} style={styles.themeBtn}>
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: theme.swatch,
                    borderColor: selected ? colors.text : 'transparent',
                  },
                ]}>
                {selected ? <MaterialIcons name="check" size={18} color="#FFFFFF" /> : null}
              </View>
              <Text
                style={[
                  styles.themeLabel,
                  { color: selected ? colors.text : colors.textSecondary },
                ]}>
                {theme.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  section: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  hint: { fontSize: 13, lineHeight: 18, marginBottom: 14 },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
  },
  modeLabel: { fontSize: 12, fontWeight: '700' },
  subhead: { fontSize: 14, fontWeight: '700', marginTop: 18, marginBottom: 12 },
  themeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  themeBtn: { width: '23%', alignItems: 'center', gap: 8 },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
  },
  themeLabel: { fontSize: 12, fontWeight: '600' },
});
