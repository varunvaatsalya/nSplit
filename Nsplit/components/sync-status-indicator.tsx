import { Text, View, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { subscribeSyncStatus, getSyncStatus } from '@/src/sync/status';
import type { SyncStatus } from '@/src/sync/types';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const LABELS: Record<SyncStatus, string> = {
  online: '',
  offline: 'Offline · Changes will sync automatically',
  syncing: 'Syncing…',
  synced: 'Synced',
  sync_failed: 'Sync failed',
};

/** Subtle sync status strip — not an intrusive banner. */
export function SyncStatusIndicator() {
  const scheme = useColorScheme() ?? 'light';
  const colors = Colors[scheme];
  const [status, setStatus] = useState<SyncStatus>(getSyncStatus());

  useEffect(() => subscribeSyncStatus(setStatus), []);

  const label = LABELS[status];
  if (!label || status === 'online') return null;

  const color =
    status === 'offline' || status === 'sync_failed'
      ? colors.warning
      : status === 'synced'
        ? colors.success
        : colors.textSecondary;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.softSurface, borderColor: colors.border }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: {
    fontSize: 12,
    textAlign: 'center',
  },
});
