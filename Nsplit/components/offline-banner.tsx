import { StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { useOfflineOptional } from '@/src/offline/offline-context';

export function OfflineBanner() {
  const colors = useColors();
  const offline = useOfflineOptional();
  if (!offline || offline.online) return null;

  return (
    <View style={[styles.banner, { backgroundColor: colors.softSurface, borderColor: colors.border }]}>
      <Text style={[styles.text, { color: colors.text }]}>Offline</Text>
      <Text style={[styles.sub, { color: colors.textSecondary }]}>
        Your profile, groups, and expenses stay on this phone. You can keep adding bills.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 2,
  },
  text: {
    fontSize: 13,
    fontWeight: '700',
  },
  sub: {
    fontSize: 12,
    lineHeight: 16,
  },
});
