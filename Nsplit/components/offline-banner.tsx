import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { dismissOfflineNotice, isOfflineNoticeDismissed } from '@/src/db/preferences';
import { useOfflineOptional } from '@/src/offline/offline-context';

/**
 * Home-screen notice while the phone is offline. Closing it hides it for good,
 * so it doesn't come back the next time the phone goes offline.
 */
export function OfflineBanner() {
  const colors = useColors();
  const offline = useOfflineOptional();
  // Hidden until the saved preference is read, so it never flashes.
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    let alive = true;
    isOfflineNoticeDismissed()
      .then((value) => alive && setDismissed(value))
      .catch(() => alive && setDismissed(false));
    return () => {
      alive = false;
    };
  }, []);

  if (dismissed || !offline || offline.online) return null;

  function close() {
    setDismissed(true);
    dismissOfflineNotice().catch(() => {});
  }

  return (
    <View
      style={[styles.banner, { backgroundColor: `${colors.warning}14`, borderColor: `${colors.warning}55` }]}
      accessibilityRole="alert">
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>You’re offline</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Keep adding expenses. They’re saved on this phone and sync when you’re back online.
        </Text>
      </View>
      <Pressable onPress={close} hitSlop={10} accessibilityRole="button" accessibilityLabel="Dismiss">
        <Feather name="x" size={18} color={colors.textSecondary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  title: { fontSize: 14, fontWeight: '700' },
  sub: { fontSize: 12, lineHeight: 17, marginTop: 2 },
});
