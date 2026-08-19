import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { useColors } from '@/hooks/use-colors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  combineDateTime,
  formatWhenLabel,
  toLocalDateValue,
  toLocalTimeValue,
} from '@/src/lib/expense-form-utils';

export function WhenModal({
  open,
  value,
  onClose,
  onSave,
}: {
  open: boolean;
  value: Date;
  onClose: () => void;
  onSave: (next: Date) => void;
}) {
  const colors = useColors();
  const colorScheme = useColorScheme() ?? 'light';
  const [draft, setDraft] = useState(value);
  const [mode, setMode] = useState<'date' | 'time' | null>(Platform.OS === 'ios' ? 'date' : null);
  const [timeOpen, setTimeOpen] = useState(false);
  const pickerMode: 'date' | 'time' = Platform.OS === 'ios' ? (timeOpen ? 'time' : 'date') : mode || 'date';

  function resetFromValue() {
    setDraft(value);
    setMode(Platform.OS === 'ios' ? 'date' : null);
    setTimeOpen(false);
  }

  function onPicker(event: DateTimePickerEvent, selected?: Date) {
    if (Platform.OS === 'android') setMode(null);
    if (event.type === 'dismissed' || !selected) return;
    setDraft((prev) => {
      const next = new Date(prev);
      if (pickerMode === 'time') {
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      } else {
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      }
      return next;
    });
  }

  const iosPicker =
    Platform.OS === 'ios' ? (
      <DateTimePicker
        value={draft}
        mode={timeOpen ? 'time' : 'date'}
        display="spinner"
        themeVariant={colorScheme}
        onChange={onPicker}
      />
    ) : mode ? (
      <DateTimePicker
        value={draft}
        mode={mode}
        display="default"
        themeVariant={colorScheme}
        onChange={onPicker}
      />
    ) : null;

  return (
    <Modal
      visible={open}
      animationType="slide"
      onRequestClose={onClose}
      onShow={resetFromValue}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>When</Text>
          <Pressable onPress={onClose}>
            <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>Cancel</Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.textSecondary, paddingHorizontal: 20, marginBottom: 12 }}>
          Pick a date. Time stays on now unless you change it.
        </Text>

        {Platform.OS === 'android' ? (
          <View style={{ paddingHorizontal: 20, gap: 10 }}>
            <Pressable
              onPress={() => setMode('date')}
              style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <MaterialIcons name="event" size={18} color={colors.textSecondary} />
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Date</Text>
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {draft.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            </Pressable>
            <Pressable
              onPress={() => setMode('time')}
              style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <MaterialIcons name="schedule" size={18} color={colors.textSecondary} />
              <View>
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Time</Text>
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {draft.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
            </Pressable>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 12 }}>
            <View style={[styles.toggle, { backgroundColor: colors.softSurface }]}>
              <Pressable
                onPress={() => setTimeOpen(false)}
                style={[
                  styles.toggleBtn,
                  !timeOpen && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                ]}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Date</Text>
              </Pressable>
              <Pressable
                onPress={() => setTimeOpen(true)}
                style={[
                  styles.toggleBtn,
                  timeOpen && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
                ]}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Time</Text>
              </Pressable>
            </View>
            {iosPicker}
          </View>
        )}

        {Platform.OS === 'android' ? iosPicker : null}

        <View style={styles.footer}>
          <Pressable
            onPress={() => setDraft(new Date())}
            style={[styles.ghost, { borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>Now</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const dateStr = toLocalDateValue(draft);
              const timeStr = toLocalTimeValue(draft);
              onSave(combineDateTime(dateStr, timeStr));
            }}
            style={[styles.done, { backgroundColor: colors.primary }]}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Done</Text>
          </Pressable>
        </View>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 8 }}>
          {formatWhenLabel(draft)}
        </Text>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingTop: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: { fontSize: 22, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  toggle: { flexDirection: 'row', alignSelf: 'center', borderRadius: 999, padding: 4, marginBottom: 8 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  ghost: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  done: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
});
