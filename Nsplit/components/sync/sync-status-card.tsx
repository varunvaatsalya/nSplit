import Feather from '@expo/vector-icons/Feather';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useColors } from '@/hooks/use-colors';
import { useSync, type SyncState } from '@/src/sync/sync-context';

function ago(iso: string | null) {
  if (!iso) return 'not yet';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(iso).toLocaleDateString();
}

const ICON: Record<SyncState, keyof typeof Feather.glyphMap> = {
  'signed-out': 'cloud-off',
  offline: 'wifi-off',
  syncing: 'refresh-cw',
  synced: 'check-circle',
  pending: 'upload-cloud',
  error: 'alert-circle',
};

/** Backup / sync status with a manual "Sync now". */
export function SyncStatusCard() {
  const colors = useColors();
  const { state, pending, lastSyncedAt, error, rejected, syncNow } = useSync();

  const tone = state === 'error' ? colors.danger : state === 'synced' ? colors.success : colors.textSecondary;
  const title: Record<SyncState, string> = {
    'signed-out': 'Not backed up',
    offline: 'Offline',
    syncing: 'Syncing…',
    synced: 'All changes synced',
    pending: `${pending} change${pending === 1 ? '' : 's'} waiting`,
    error: 'Sync paused',
  };
  const detail: Record<SyncState, string> = {
    'signed-out': 'Log in to back up your groups and use them on other devices.',
    offline: pending
      ? `${pending} change${pending === 1 ? '' : 's'} will upload when you are back online.`
      : 'Everything is saved on this phone.',
    syncing: 'Uploading your changes and fetching updates.',
    synced: `Last synced ${ago(lastSyncedAt)}.`,
    pending: 'They will upload in a moment.',
    error: `${error || 'Could not reach the server'}. Retrying automatically.`,
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.icon, { backgroundColor: colors.softSurface }]}>
        {state === 'syncing' ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather name={ICON[state]} size={18} color={tone} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{title[state]}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2, lineHeight: 16 }}>
          {detail[state]}
        </Text>
        {rejected ? (
          <Text style={{ color: colors.danger, fontSize: 12, marginTop: 4, lineHeight: 16 }}>
            {rejected.count} change{rejected.count === 1 ? '' : 's'} could not upload: {rejected.error}
          </Text>
        ) : null}
      </View>
      {state !== 'signed-out' && state !== 'syncing' && state !== 'offline' ? (
        <Pressable onPress={() => syncNow().catch(() => {})} hitSlop={8}>
          <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 13 }}>Sync now</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
