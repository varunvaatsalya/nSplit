import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useColors } from '@/hooks/use-colors';
import { ICON_SECTIONS, type EmojiItem } from '@/src/lib/expense-icons';

const GAP = 8;
const MIN_CELL = 48;
const SIDE_PADDING = 16;

export function EmojiPickerModal({
  open,
  onClose,
  value,
  onSelect,
  categoryIcon,
  onUseCategoryIcon,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (item: EmojiItem) => void;
  /** When given, a top row lets the user go back to the category's own icon. */
  categoryIcon?: { emoji: string; label: string };
  onUseCategoryIcon?: () => void;
}) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  // Fill each row evenly instead of leaving a ragged right edge.
  const available = width - SIDE_PADDING * 2;
  const columns = Math.max(5, Math.floor((available + GAP) / (MIN_CELL + GAP)));
  const cell = Math.floor((available - GAP * (columns - 1)) / columns);
  const followsCategory = Boolean(categoryIcon && value === categoryIcon.emoji);

  return (
    <BottomSheet open={open} onClose={onClose} title="Choose icon">
      {categoryIcon && onUseCategoryIcon ? (
        <Pressable
          onPress={() => {
            onUseCategoryIcon();
            onClose();
          }}
          style={[
            styles.categoryRow,
            {
              borderColor: followsCategory ? colors.primary : colors.border,
              backgroundColor: followsCategory ? colors.softSurface : colors.background,
            },
          ]}>
          <Text style={{ fontSize: 24 }}>{categoryIcon.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>Use category icon</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>
              Follows {categoryIcon.label}
            </Text>
          </View>
          {followsCategory ? (
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12 }}>Selected</Text>
          ) : null}
        </Pressable>
      ) : null}

      {ICON_SECTIONS.map((section) => (
        <View key={section.label} style={{ marginBottom: 18 }}>
          <Text style={[styles.section, { color: colors.textSecondary }]}>{section.label.toUpperCase()}</Text>
          <View style={styles.grid}>
            {section.emojis.map((emoji) => {
              const selected = value === emoji && !followsCategory;
              return (
                <Pressable
                  key={`${section.label}-${emoji}`}
                  onPress={() => {
                    onSelect({ emoji });
                    onClose();
                  }}
                  style={[
                    styles.cell,
                    {
                      width: cell,
                      height: cell,
                      borderColor: selected ? colors.primary : 'transparent',
                      backgroundColor: selected ? colors.softSurface : colors.background,
                    },
                  ]}>
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
  },
  section: { fontSize: 11, fontWeight: '700', marginBottom: 8, letterSpacing: 0.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: {
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
