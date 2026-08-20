import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useColors } from '@/hooks/use-colors';

export type RecordTab = 'expense' | 'transfer';

export function RecordTypeTabs({
  value,
  onChange,
}: {
  value: RecordTab;
  onChange: (next: RecordTab) => void;
}) {
  const colors = useColors();

  return (
    <View style={[styles.track, { backgroundColor: colors.softSurface }]}>
      {(['expense', 'transfer'] as const).map((key) => {
        const active = value === key;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[
              styles.tab,
              active && { backgroundColor: colors.surface },
            ]}>
            <Text
              style={{
                textAlign: 'center',
                fontSize: 14,
                fontWeight: '600',
                color: active ? colors.text : colors.textSecondary,
              }}>
              {key === 'expense' ? 'Expense' : 'Transfer'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 4,
  },
});
