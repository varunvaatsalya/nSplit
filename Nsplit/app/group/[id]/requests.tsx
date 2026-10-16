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
import { listRequests, reviewRequest, type ShareRequest } from '@/src/api/requests';
import type { GroupDetail, GroupMember } from '@/src/api/types';
import { getGroup } from '@/src/db/groups';
import { formatLongDate, formatMinor, memberName } from '@/src/lib/format';
import { getExpenseEmoji } from '@/src/lib/icons';
import { useOffline } from '@/src/offline/offline-context';
import { useSync } from '@/src/sync/sync-context';

const SPLIT_LABELS: Record<string, string> = {
  EQUAL: 'equally',
  EXACT: 'by amount',
  SHARES: 'by parts',
  PERCENTAGE: 'by percent',
};

function names(ids: string[], byId: Record<string, GroupMember>) {
  const list = ids.map((id) => memberName(byId[id]));
  return list.length <= 3 ? list.join(', ') : `${list.slice(0, 3).join(', ')} +${list.length - 3}`;
}

/** Plain-English description of what a request asks for. */
function describe(request: ShareRequest, byId: Record<string, GroupMember>, currency: string) {
  const p = request.payload;
  if (request.kind === 'join') {
    return {
      icon: '🙋',
      title: `Join as ${request.submitterName}`,
      amount: null,
      lines: [`${request.requesterName || 'Someone'} · ${request.requesterEmail || 'no email'}`],
    };
  }
  if (request.kind === 'payment') {
    return {
      icon: p.icon || '💸',
      title: p.title || `${memberName(byId[p.fromMemberId || ''])} paid ${memberName(byId[p.toMemberId || ''])}`,
      amount: formatMinor(p.amountMinor || 0, currency),
      lines: [
        `${memberName(byId[p.fromMemberId || ''])} → ${memberName(byId[p.toMemberId || ''])}`,
        p.note ? `“${p.note}”` : null,
      ].filter(Boolean) as string[],
    };
  }
  const payers = (p.payers || []).map((x) => x.memberId);
  const split = (p.participants || []).filter((x) => x.included !== false).map((x) => x.memberId);
  return {
    icon: getExpenseEmoji(p.icon, p.categoryKey),
    title: p.title || 'Expense',
    amount: formatMinor(p.amountMinor || 0, currency),
    lines: [
      `Paid by ${names(payers, byId)} · ${formatLongDate(p.expenseDate)}`,
      `Split ${SPLIT_LABELS[p.splitMethod || ''] || ''} between ${names(split, byId)}`,
      p.description ? `“${p.description}”` : null,
    ].filter(Boolean) as string[],
  };
}

const STATUS: Record<ShareRequest['status'], { label: string; color: 'warning' | 'success' | 'danger' }> = {
  PENDING: { label: 'Waiting for approval', color: 'warning' },
  APPROVED: { label: 'Approved', color: 'success' },
  REJECTED: { label: 'Declined', color: 'danger' },
};

/**
 * Requests for a group. Admins approve or decline join requests and suggested
 * expenses/payments; members follow the ones they sent.
 */
export default function RequestsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { online } = useOffline();
  const { syncNow } = useSync();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [requests, setRequests] = useState<ShareRequest[] | null>(null);
  const [canReview, setCanReview] = useState(false);
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
    const res = await listRequests(local.code, true);
    if (!res.ok || !res.data) {
      setError(res.error?.message || 'Could not load requests.');
      setRequests([]);
      return;
    }
    setError('');
    setRequests(res.data.requests);
    setCanReview(res.data.canReview);
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
      // 409: someone else already reviewed it.
      if (!res.ok && res.status !== 409) {
        setError(res.error?.message || 'Could not update this request.');
        return;
      }
      setDeclining(null);
      setReason('');
      // Approving created a record or a member on the server; bring it here.
      if (action === 'approve') syncNow().catch(() => {});
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const byId = Object.fromEntries((group?.members || []).map((m) => [m._id, m]));
  const currency = group?.currency || 'INR';
  const pending = (requests || []).filter((r) => r.status === 'PENDING');
  const reviewed = (requests || []).filter((r) => r.status !== 'PENDING');

  function card(r: ShareRequest) {
    const d = describe(r, byId, currency);
    const busy = busyId === r._id;
    const status = STATUS[r.status];
    const showActions = canReview && r.status === 'PENDING';
    return (
      <View key={r._id} style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        {canReview && r.kind !== 'join' ? (
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 8 }}>
            <Text style={{ color: colors.text, fontWeight: '700' }}>{r.submitterName}</Text>
            {r.kind === 'payment' ? ' recorded a payment' : ' suggested an expense'} · {formatLongDate(r.createdAt)}
            {r.requesterEmail ? `\n${r.requesterEmail}` : ''}
          </Text>
        ) : null}
        <View style={styles.row}>
          <View style={[styles.icon, { backgroundColor: colors.softSurface }]}>
            <Text style={{ fontSize: 18 }}>{d.icon}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={styles.titleRow}>
              <Text style={{ flex: 1, color: colors.text, fontWeight: '700' }}>{d.title}</Text>
              {d.amount ? <Text style={{ color: colors.text, fontWeight: '700' }}>{d.amount}</Text> : null}
            </View>
            {d.lines.map((line) => (
              <Text key={line} style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                {line}
              </Text>
            ))}
            {!showActions ? (
              <Text style={{ color: colors[status.color], fontSize: 12, fontWeight: '700', marginTop: 6 }}>
                {status.label}
                {r.status === 'REJECTED' && r.rejectReason ? (
                  <Text style={{ color: colors.textSecondary, fontWeight: '400' }}> · {r.rejectReason}</Text>
                ) : null}
              </Text>
            ) : null}
          </View>
        </View>
        {showActions ? (
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
              <PrimaryButton
                title={busy ? 'Approving…' : r.kind === 'join' ? 'Approve join' : 'Approve'}
                loading={busy}
                onPress={() => void act(r, 'approve')}
              />
            </View>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <SettingsHeader title={canReview ? 'Requests' : 'Your requests'} />
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
          {canReview
            ? 'People asking to join this group, and expenses or payments members sent for approval.'
            : 'Expenses and payments you sent. They are added once an admin approves them.'}
        </Text>
        {error ? <Text style={{ color: colors.danger, marginBottom: 12 }}>{error}</Text> : null}

        {requests === null ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
        ) : requests.length === 0 && !error ? (
          <View style={styles.empty}>
            <MaterialIcons name="inbox" size={32} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, marginTop: 8 }}>
              {canReview ? 'Nothing waiting. You’re all caught up.' : 'You haven’t sent anything yet.'}
            </Text>
          </View>
        ) : (
          <>
            {pending.length ? (
              <>
                <Text style={[styles.section, { color: colors.textSecondary }]}>WAITING ({pending.length})</Text>
                {pending.map(card)}
              </>
            ) : null}
            {reviewed.length ? (
              <>
                <Text style={[styles.section, { color: colors.textSecondary }]}>REVIEWED</Text>
                {reviewed.map(card)}
              </>
            ) : null}
          </>
        )}
      </ScrollView>

      <Modal visible={Boolean(declining)} transparent animationType="fade" onRequestClose={() => setDeclining(null)}>
        <View style={styles.overlay}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={() => setDeclining(null)} />
          <View style={[styles.sheet, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>Decline this request?</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, marginBottom: 12 }}>
              {declining?.kind === 'join'
                ? `${declining?.requesterName || 'They'} will see the request was declined.`
                : `${declining?.submitterName} will see it was declined, with your reason.`}
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Reason (optional)"
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
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 8, marginBottom: 8 },
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
