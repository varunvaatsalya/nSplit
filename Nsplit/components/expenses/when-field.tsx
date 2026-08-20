import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Clock } from 'lucide-react-native';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColors } from '@/hooks/use-colors';
import { formatWhenDateLabel, formatWhenTimeLabel } from '@/src/lib/expense-form-utils';

export function WhenField({
  value,
  onChange,
}: {
  value: Date;
  onChange: (next: Date) => void;
}) {
  const colors = useColors();
  const colorScheme = useColorScheme() ?? 'light';
  const [androidMode, setAndroidMode] = useState<'date' | 'time' | null>(null);
  const [chainTime, setChainTime] = useState(false);
  const [iosOpen, setIosOpen] = useState(false);
  const [iosMode, setIosMode] = useState<'datetime' | 'time'>('datetime');

  function applyPart(selected: Date, mode: 'date' | 'time' | 'datetime') {
    const next = new Date(value);
    if (mode === 'time') {
      next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    } else if (mode === 'date') {
      next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    } else {
      next.setTime(selected.getTime());
    }
    onChange(next);
  }

  function onPicker(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') {
      const current = androidMode;
      setAndroidMode(null);
      if (event.type === 'dismissed' || !selected || !current) {
        setChainTime(false);
        return;
      }
      applyPart(selected, current);
      if (current === 'date' && chainTime) {
        setChainTime(false);
        setTimeout(() => setAndroidMode('time'), 80);
      } else {
        setChainTime(false);
      }
      return;
    }
    if (event.type === 'dismissed' || !selected) return;
    applyPart(selected, iosMode);
  }

  function openDate() {
    if (Platform.OS === 'android') {
      setChainTime(true);
      setAndroidMode('date');
      return;
    }
    setIosMode('datetime');
    setIosOpen(true);
  }

  function openTime() {
    if (Platform.OS === 'android') {
      setChainTime(false);
      setAndroidMode('time');
      return;
    }
    setIosMode('time');
    setIosOpen(true);
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.field, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View className="flex-row items-end gap-2">
          <Pressable onPress={openDate} style={styles.dateHit}>
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>When</Text>
            <Text style={{ color: colors.text, fontWeight: '600', marginTop: 2 }} numberOfLines={1}>
              {formatWhenDateLabel(value)}
            </Text>
          </Pressable>
          <Pressable onPress={openTime} hitSlop={8} className="flex-row items-center gap-1">
            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>
              {formatWhenTimeLabel(value)}
            </Text>
            <Clock size={16} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      {Platform.OS === 'ios' && iosOpen ? (
        <View style={[styles.iosWrap, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.iosHead}>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {iosMode === 'time' ? 'Set time' : 'Set date & time'}
            </Text>
            <Pressable onPress={() => setIosOpen(false)} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Done</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={value}
            mode={iosMode}
            display="spinner"
            themeVariant={colorScheme}
            onChange={onPicker}
          />
        </View>
      ) : null}

      {Platform.OS === 'android' && androidMode ? (
        <DateTimePicker
          value={value}
          mode={androidMode}
          display="default"
          themeVariant={colorScheme}
          onChange={onPicker}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  field: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dateHit: { flex: 1, minWidth: 0 },
  iosWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  iosHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
  },
});
