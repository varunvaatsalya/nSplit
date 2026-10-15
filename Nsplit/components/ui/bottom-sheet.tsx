import { useEffect, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView, ScrollView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useColors } from '@/hooks/use-colors';

/** Bottom sheet with a drag handle; swipe down or tap the backdrop to close. */
export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  heightRatio = 0.6,
  maxHeight = 540,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  heightRatio?: number;
  maxHeight?: number;
  children: ReactNode;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.min(height * heightRatio, maxHeight);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (open) translateY.set(0);
  }, [open, translateY]);

  const close = () => {
    translateY.set(0);
    onClose();
  };

  const pan = Gesture.Pan()
    .activeOffsetY(12)
    .failOffsetX([-24, 24])
    .onUpdate((event) => {
      translateY.set(Math.max(0, event.translationY));
    })
    .onEnd((event) => {
      if (event.translationY > 70 || event.velocityY > 700) {
        translateY.set(withTiming(sheetHeight, { duration: 180 }, (finished) => {
          if (finished) runOnJS(close)();
        }));
      } else {
        translateY.set(withTiming(0, { duration: 180 }));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.get() }],
  }));

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={close} />
          <GestureDetector gesture={pan}>
            <Animated.View
              style={[
                styles.sheet,
                {
                  height: sheetHeight,
                  backgroundColor: colors.elevated,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
                sheetStyle,
              ]}>
              <View style={styles.dragArea}>
                <View style={[styles.handle, { backgroundColor: colors.border }]} />
                <View style={styles.header}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
                    {subtitle ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{subtitle}</Text>
                    ) : null}
                  </View>
                  <Pressable onPress={close} hitSlop={8}>
                    <Text style={{ color: colors.primary, fontWeight: '600' }}>Close</Text>
                  </Pressable>
                </View>
              </View>
              <ScrollView
                contentContainerStyle={styles.body}
                keyboardShouldPersistTaps="handled"
                bounces={false}>
                {children}
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
  backdrop: { ...StyleSheet.absoluteFill },
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
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  title: { fontSize: 18, fontWeight: '700' },
  body: { paddingHorizontal: 16, paddingBottom: 20 },
});
