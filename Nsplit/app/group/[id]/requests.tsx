import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '@/components/settings/settings-header';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useColors } from '@/hooks/use-colors';
import { listPendingRequests, reviewRequest, type ShareRequest } from '@/src/api/requests';
import type { GroupDetail, GroupMember } from '@/src/api/types';
import { getGroup } from '@/src/db/groups';
import { suggestCategory } from '@/src/lib/expense-icons';
import { getExpenseEmoji } from '@/src/lib/icons';
import { formatLongDate, formatMinor, memberName } from '@/src/lib/format';
import { useOffline } from '@/src/offline/offline-context';
import { useSync } from '@/src/sync/sync-context';

/** Plain-English description of what a request would add. */
function describe(request: ShareRequest, byId: Record<string, GroupMember>, currency: string) {
  const p = request.payload;
  if (request.kind === 'payment') {
    return {
      icon: '💸',
      title: `${memberName(byId[p.fromMemberId || ''])} paid ${memberName(byId[p.toMemberId || ''])}`,
      lines: [p.note ? `“${p.note}”` : null].filter(Boolean) as string[],
    };
  }
  const count = p.splitMemberIds?.length || 1;
  return {
    icon: getExpenseEmoji(null, suggestCategory(p.title || '').key),
    title: p.title || 'Expense',
    lines: [
      `Paid by ${memberName(byId[p.paidByMemberId || ''])} · ${formatLongDate(p.expenseDate)}`,
      `Split equally between ${count} ${count === 1 ? 'person' : 'people'} (about ${formatMinor(Math.floor(p.amountMinor / count), currency)} each)`,
      p.note ? `“${p.note}”` : null,
    ].filter(Boolean) as string[],
  };
}

export default function RequestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { online } = useOffline();
  const { syncNow } = useSync();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [requests, setRequests] = useState<ShareRequest[] | null>(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [declining, setDeclining] = useState<ShareRequest | null>(null);
  const [reason, setReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const local = await getGroup(String(id));
    setGroup(local);
    if (!local) return;
    if (!online) {
      setError('Connect to the internet to see requests.');
      setRequests([]);
      return;
    }
    const res = await listPendingRequests(local.code);
    if (!res.ok || !res.data) {
      setError(res.error?.message || 'Could not load requests.');
      setRequests([]);
      return;
    }
    setError('');
    setRequests(res.data.requests);
  }, [id, online]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setError('Could not load requests.'));
    }, [load])
  );

  async function act(request: ShareRequest, action: 'approve' | 'reject') {
    if (!group || busyId) return;
    setBusyId(request._id);
    setError('');
    try {
      const res = await reviewRequest(group.code, request._id, action, action === 'reject' ? reason.trim() : null);
      // 409: someone else already reviewed it; either way it leaves the inbox.
      if (!res.ok && res.status !== 409) {
        setError(res.error?.message || 'Could not update this request.');
        return;
      }
      setRequests((prev) => (prev || []).filter((r) => r._id !== request._id));
      setDeclining(null);
      setReason('');
      // Approval created the record on the server; bring it to this phone.
      if (action === 'approve') syncNow().catch(() => {});
    } finally {
      setBusyId(null);
    }
  }

  const byId = Object.fromEntries((group?.members || []).map((m) => [m._id, m]));
  const currency = group?.currency || 'INR';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <SettingsHeader title="Requests" />
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load().catch(() => {});
              setRefreshing(false);
            }}
          />
        }>
        <Text style={{ color: colors.textSecondary, marginBottom: 14, lineHeight: 19 }}>
          Sent by people using this group’s share link. Approving adds it to the ledger.
        </Text>
        {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

        {requests === null ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : requests.length === 0 && !error ? (
          <View style={styles.empty}>
            <MaterialIcons name="inbox" size={32} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>Nothing waiting. You’re all caught up.</Text>
          </View>
        ) : (
          requests.map((r) => {
            const d = describe(r, byId, currency);
            const busy = busyId === r._id;
            return (
              <View key={r._id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
                  <Text style={{ color: colors.text, fontWeight: '700' }}>{r.submitterName}</Text>
                  {r.kind === 'payment' ? ' says they paid' : ' suggested an expense'} · {formatLongDate(r.createdAt)}
                </Text>
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: colors.softSurface }]}>
                    <Text style={{ fontSize: 18 }}>{d.icon}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.titleRow}>
                      <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }}>{d.title}</Text>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{formatMinor(r.payload.amountMinor, currency)}</Text>
                    </View>
                    {d.lines.map((line) => (
                      <Text key={line} style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                        {line}
                      </Text>
                    ))}
                  </View>
                </View>
                <View style={[styles.row, { marginTop: 12 }]}>
                  <Pressable
                    disabled={busy}
                    onPress={() => {
                      setReason('');
                      setDeclining(r);
                    }}
                    style={[styles.ghostBtn, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>Decline</Text>
                  </Pressable>
                  <View style={{ flex: 1 }}>
                    <PrimaryButton title={busy ? 'Adding…' : 'Approve'} loading={busy} onPress={() => void act(r, 'approve')} />
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal visible={Boolean(declining)} transparent animationType="fade" onRequestClose={() => setDeclining(null)}>
        <View style={styles.overlay}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={() => setDeclining(null)} />
          <View style={[styles.sheet, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>Decline this request?</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, marginBottom: 12 }}>
              {declining?.submitterName} will see it was declined, with your reason.
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason (optional), e.g. already added"
              placeholderTextColor={colors.textSecondary}
              maxLength={200}
              autoFocus
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
            />
            <View style={[styles.row, { marginTop: 12 }]}>
              <Pressable onPress={() => setDeclining(null)} style={[styles.ghostBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>Back</Text>
              </Pressable>
              <Pressable
                disabled={Boolean(busyId)}
                onPress={() => declining && void act(declining, 'reject')}
                style={[styles.ghostBtn, { borderColor: colors.danger, backgroundColor: colors.danger }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{busyId ? 'Declining…' : 'Decline'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: { alignItems: 'center', marginTop: 40 },
  card: { borderWidth: 1, borderRadius: 18, padding: 14, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  ghostBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  sheet: { borderWidth: 1, borderRadius: 18, padding: 18 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
});
