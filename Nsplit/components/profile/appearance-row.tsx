import Feather from '@expo/vector-icons/Feather';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppearanceSettings } from '@/components/profile/appearance-settings';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { COLOR_THEMES } from '@/constants/theme';
import { useColors } from '@/hooks/use-colors';
import { useAppearance } from '@/src/theme/appearance-context';

const MODE_LABEL = { system: 'System', light: 'Light', dark: 'Dark' } as const;

/** Profile row showing the current look; opens the appearance options in a sheet. */
export function AppearanceRow({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const { mode, colorTheme } = useAppearance();
  const [open, setOpen] = useState(false);
  const themeLabel = COLOR_THEMES.find((t) => t.id === colorTheme)?.label;

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }, style]}>
        <View style={[styles.rowIcon, { backgroundColor: `${colors.primary}1A` }]}>
          <Feather name="sun" size={18} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>Appearance</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>
            {[MODE_LABEL[mode], themeLabel].filter(Boolean).join(' · ')}
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
      </Pressable>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title="Appearance"
        subtitle="Default follows this phone. You can lock light or dark, and pick a color theme."
        heightRatio={0.5}>
        <AppearanceSettings embedded />
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12 },
  rowIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
