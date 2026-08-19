import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';
import { EXPENSE_ICON_SECTIONS, type EmojiItem } from '@/src/lib/expense-icons';

export function EmojiPickerModal({
  open,
  onClose,
  value,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (item: EmojiItem) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.min(height * 0.52, 420);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (open) translateY.value = 0;
  }, [open, translateY]);

  const close = () => {
    translateY.value = 0;
    onClose();
  };

  const pan = Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > 70 || event.velocityY > 700) {
        translateY.value = withTiming(sheetHeight, { duration: 180 }, (finished) => {
          if (finished) runOnJS(close)();
        });
      } else {
        translateY.value = withTiming(0, { duration: 180 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={close} />
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                styles.sheet,
                {
                  height: sheetHeight,
                  backgroundColor: colors.surface,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
                sheetStyle,
              ]}>
              <View style={styles.dragArea}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
                <View style={styles.header}>
                  <Text style={[styles.title, { color: colors.text }]}>Choose icon</Text>
                  <Pressable onPress={close} hitSlop={8}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Close</Text>
                  </Pressable>
                </View>
              </View>
              <ScrollView
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                bounces={false}>
                {EXPENSE_ICON_SECTIONS.map((section) => (
                  <View key={section.label} style={{ marginBottom: 18 }}>
                    <Text style={[styles.section, { color: colors.textSecondary }]}>{section.label}</Text>
                    <View style={styles.grid}>
                      {section.icons.map((item) => {
                        const selected = value === item.emoji;
                        return (
                          <Pressable
                            key={`${section.label}-${item.emoji}`}
                            onPress={() => {
                              onSelect(item);
                              close();
                            }}
                            style={[
                              styles.cell,
                              {
                                borderColor: selected ? colors.primary : colors.border,
                                backgroundColor: selected ? colors.softSurface : colors.background,
                              },
                            ]}>
                            <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  dragArea: { paddingTop: 8, paddingBottom: 4 },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    marginTop: 6,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  title: { fontSize: 18, fontWeight: '700' },
  body: { paddingHorizontal: 16, paddingBottom: 20 },
  section: { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
