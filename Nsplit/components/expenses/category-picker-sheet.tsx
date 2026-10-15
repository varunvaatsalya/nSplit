import Feather from '@expo/vector-icons/Feather';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/ui/bottom-sheet';
import { useColors } from '@/hooks/use-colors';
import { CATEGORIES, type Category } from '@/src/lib/expense-icons';

export function CategoryPickerSheet({
  open,
  onClose,
  value,
  suggestedKey,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  /** What the title alone suggests; marked so the user can get back to it. */
  suggestedKey?: string;
  onSelect: (category: Category) => void;
}) {
  const colors = useColors();

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Category"
      subtitle="Picked from the title. Change it any time."
      heightRatio={0.62}>
      <View style={styles.grid}>
        {CATEGORIES.map((category) => {
          const selected = category.key === value;
          const suggested = category.key === suggestedKey && category.key !== 'other';
          return (
            <Pressable
              key={category.key}
              onPress={() => {
                onSelect(category);
                onClose();
              }}
              style={[
                styles.tile,
                {
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.softSurface : colors.background,
                },
              ]}>
              {selected ? (
                <View style={[styles.check, { backgroundColor: colors.primary }]}>
                  <Feather name="check" size={10} color={colors.primaryForeground} />
                </View>
              ) : null}
              <View style={[styles.emojiWrap, { backgroundColor: colors.softSurface }]}>
                <Text style={{ fontSize: 22 }}>{category.emoji}</Text>
              </View>
              <Text
                style={[styles.label, { color: colors.text, fontWeight: selected ? '700' : '600' }]}
                numberOfLines={2}>
                {category.label}
              </Text>
              {suggested ? (
                <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700', marginTop: 2 }}>
                  Suggested
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  tile: {
    width: '31.5%',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  label: { fontSize: 12, textAlign: 'center', lineHeight: 15 },
});
