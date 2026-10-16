import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BrokenBulb from '@/assets/illustrations/broken-bulb.svg';
import { BalanceView } from '@/components/balance/balance-view';
import { GroupFeed, groupFeedItems, type FeedItem } from '@/components/groups/group-feed';
import { RecordDetailModal } from '@/components/records/record-detail-modal';
import { PrimaryButton } from '@/components/ui/primary-button';
import { UserAvatar } from '@/components/user-avatar';
import { useColors } from '@/hooks/use-colors';
import {
  addSavedShare,
  getJoinStatus,
  getSharedLedger,
  listSavedShares,
  removeSavedShare,
  sendJoinRequest,
  type JoinStatus,
  type SharedLedger,
} from '@/src/api/shares';
import type { GroupDetail } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import { groupBalance } from '@/src/db/expenses';
import { getGroupEmoji } from '@/src/lib/icons';
import { buildLedger } from '@/src/lib/ledger';
import { memberName } from '@/src/lib/format';
import { useOffline } from '@/src/offline/offline-context';
import { useSync } from '@/src/sync/sync-context';

/**
 * Read-only view of a group opened from its share link (deep link or "Add existing").
 * Anyone can look; signed-in people can ask an admin to join as one of the members.
 */
export default function SharedGroupScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { online } = useOffline();
  const { syncNow } = useSync();
  const { width } = useWindowDimensions();

  const [data, setData] = useState<SharedLedger | null>(null);
  const [error, setError] = useState('');
  const [join, setJoin] = useState<JoinStatus | null>(null);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState<'expenses' | 'balance'>('expenses');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailIndex, setDetailIndex] = useState(0);
  const [joinOpen, setJoinOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [joinPick, setJoinPick] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    if (!online) {
      setError('Connect to the internet to view this group.');
      return;
    }
    const res = await getSharedLedger(String(token));
    if (!res.ok || !res.data) {
      setError(res.status === 404 ? 'This link was turned off or does not exist.' : res.error?.message || 'Could not load this group.');
      return;
    }
    setError('');
    setData(res.data);
    if (!user) {
      setJoin({ status: 'signed-out' });
      return;
    }
    const [status, shares] = await Promise.all([getJoinStatus(String(token)), listSavedShares()]);
    setJoin(status.ok && status.data ? status.data : { status: 'none' });
    if (shares.ok && shares.data) setSaved(shares.data.shares.some((s) => s.token === token));
  }, [token, user, online]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setError('Could not load this group.'));
    }, [load])
  );

  // Shape the public payload like a local group so the usual components render it.
  const group = useMemo<GroupDetail | null>(
    () =>
      data
        ? {
            _id: String(token),
            code: '',
            name: data.group.name,
            icon: data.group.icon,
            currency: data.group.currency,
            members: data.group.members.map((m) => ({ _id: m._id, displayName: m.displayName, avatar: m.avatar })),
          }
        : null,
    [data, token]
  );
  const expenses = useMemo(() => data?.expenses || [], [data]);
  const transfers = useMemo(() => data?.transfers || [], [data]);
  const sections = useMemo(() => groupFeedItems(expenses, transfers), [expenses, transfers]);
  const feedItems = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  const ledger = useMemo(() => buildLedger(expenses, transfers), [expenses, transfers]);
  const balance = useMemo(() => (group ? groupBalance(group, expenses, transfers) : null), [group, expenses, transfers]);

  function openRecord(kind: FeedItem['kind'], id: string) {
    const idx = feedItems.findIndex((item) => item.kind === kind && item.id === id);
    if (idx < 0) return;
    setDetailIndex(idx);
    setDetailOpen(true);
  }

  async function sendJoin() {
    if (!joinPick) return;
    setSending(true);
    try {
      const res = await sendJoinRequest(String(token), joinPick);
      if (!res.ok || !res.data) {
        Alert.alert('Could not send', res.error?.message || 'Try again.');
        return;
      }
      setJoin(res.data);
      setJoinOpen(false);
    } finally {
      setSending(false);
    }
  }

  async function openAsMember(groupCode: string) {
    // The group arrives through sync; make sure it's here before opening it.
    await syncNow().catch(() => {});
    router.replace({ pathname: '/group/[id]', params: { id: groupCode } });
  }

  async function toggleSaved() {
    setMenuOpen(false);
    if (saved) {
      await removeSavedShare(String(token));
      setSaved(false);
      router.back();
      return;
    }
    const res = await addSavedShare(String(token));
    if (res.ok && res.data && !res.data.member) setSaved(true);
  }

  const header = (
    <View style={styles.topBar}>
      <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} hitSlop={10} style={styles.iconBtn}>
        <MaterialIcons name="arrow-back" size={22} color={colors.text} />
      </Pressable>
      {group ? (
        <>
          <View style={[styles.groupIcon, { backgroundColor: colors.softSurface }]}>
            <Text style={{ fontSize: 22 }}>{getGroupEmoji(group.icon)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.groupTitle, { color: colors.text }]} numberOfLines={1}>
              {group.name}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>View only · {group.members?.length} members</Text>
          </View>
          {user && join?.status !== 'member' ? (
            <Pressable onPress={() => setMenuOpen(true)} hitSlop={10} style={styles.iconBtn} accessibilityLabel="Group options">
              <MaterialIcons name="settings" size={22} color={colors.text} />
            </Pressable>
          ) : null}
        </>
      ) : (
        <View style={{ flex: 1 }} />
      )}
    </View>
  );

  if (error) {
    const art = Math.min(240, Math.round(width * 0.6));
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        {header}
        <View style={styles.center}>
          <BrokenBulb width={art} height={art} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Link unavailable</Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 6 }}>{error}</Text>
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 2 }}>
            Ask the person who shared it for a new link.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!group || !balance) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        {header}
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const members = data?.group.members || [];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      {header}

      <JoinPanel
        join={join}
        onLogin={() => router.push('/login')}
        onJoin={() => {
          setJoinPick(null);
          setJoinOpen(true);
        }}
        onOpen={(code) => void openAsMember(code)}
      />

      <View style={styles.toggleWrap}>
        <View style={[styles.toggle, { backgroundColor: colors.softSurface }]}>
          {(['expenses', 'balance'] as const).map((key) => {
            const active = view === key;
            return (
              <Pressable
                key={key}
                onPress={() => setView(key)}
                style={[styles.toggleBtn, active && { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
                <Text style={{ color: active ? colors.text : colors.textSecondary, fontWeight: '600', textTransform: 'capitalize' }}>
                  {key}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {feedItems.length === 0 ? (
          <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>No expenses in this group yet.</Text>
        ) : view === 'balance' ? (
          <BalanceView group={group} balance={balance} ledger={ledger} canSettle={false} />
        ) : (
          <GroupFeed sections={sections} members={group.members || []} currency={group.currency || 'INR'} onOpen={openRecord} />
        )}
      </ScrollView>

      <RecordDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        items={feedItems}
        index={detailIndex}
        onIndexChange={setDetailIndex}
        group={group}
        ledger={ledger}
        readOnly
        onEditExpense={() => {}}
        onEditTransfer={() => {}}
        onDeleted={() => {}}
      />

      <Modal visible={joinOpen} transparent animationType="fade" onRequestClose={() => setJoinOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={() => setJoinOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>Which one is you?</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, marginBottom: 12, lineHeight: 19 }}>
              An admin approves it before you join. They will see your name ({user?.name}) and email ({user?.email}).
            </Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {members.map((m) => {
                const picked = joinPick === m._id;
                return (
                  <Pressable
                    key={m._id}
                    disabled={m.claimed}
                    onPress={() => setJoinPick(m._id)}
                    style={[
                      styles.pickRow,
                      {
                        borderColor: picked ? colors.primary : colors.border,
                        backgroundColor: picked ? colors.softSurface : colors.surface,
                        opacity: m.claimed ? 0.5 : 1,
                      },
                    ]}>
                    <UserAvatar name={memberName(m)} avatar={m.avatar} seed={m._id} size={32} />
                    <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                      {memberName(m)}
                    </Text>
                    {m.claimed ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Already joined</Text>
                    ) : picked ? (
                      <MaterialIcons name="check" size={20} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={{ marginTop: 12 }}>
              <PrimaryButton
                title={sending ? 'Sending…' : 'Send join request'}
                loading={sending}
                disabled={!joinPick}
                onPress={() => void sendJoin()}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} onPress={() => setMenuOpen(false)} />
          <View style={[styles.sheet, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <Pressable onPress={() => void toggleSaved()} style={styles.menuRow}>
              <MaterialIcons
                name={saved ? 'remove-circle-outline' : 'add-circle-outline'}
                size={20}
                color={saved ? colors.danger : colors.primary}
              />
              <Text style={{ color: saved ? colors.danger : colors.text, fontWeight: '600' }}>
                {saved ? 'Remove group' : 'Add to my groups'}
              </Text>
            </Pressable>
            {saved ? (
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                Takes it off your home screen. You can add it again with the link.
              </Text>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/** Join call-to-action, depending on where the viewer stands. */
function JoinPanel({
  join,
  onLogin,
  onJoin,
  onOpen,
}: {
  join: JoinStatus | null;
  onLogin: () => void;
  onJoin: () => void;
  onOpen: (groupCode: string) => void;
}) {
  const colors = useColors();
  if (!join) return null;
  const box = [styles.joinBox, { borderColor: colors.border, backgroundColor: colors.surface }];

  if (join.status === 'member') {
    return (
      <View style={box}>
        <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>You’re a member of this group.</Text>
        <Pressable onPress={() => onOpen(join.groupCode)} style={[styles.smallBtn, { backgroundColor: colors.primary }]}>
          <Text style={{ color: colors.primaryForeground, fontWeight: '700' }}>Open group</Text>
        </Pressable>
      </View>
    );
  }
  if (join.status === 'pending') {
    return (
      <View style={box}>
        <MaterialIcons name="schedule" size={20} color={colors.warning} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>Join request sent</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
            You asked to join as {join.request.submitterName}. An admin needs to approve it.
          </Text>
        </View>
      </View>
    );
  }
  const declined = join.status === 'rejected';
  return (
    <View style={box}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontWeight: '600' }}>
          {declined ? 'Your join request was declined' : 'Part of this group?'}
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
          {declined
            ? join.request.rejectReason || 'You can ask again with the right name.'
            : 'Join to see it with your groups and add expenses for approval.'}
        </Text>
      </View>
      <Pressable
        onPress={join.status === 'signed-out' ? onLogin : onJoin}
        style={[styles.smallBtn, { backgroundColor: colors.primary }]}>
        <Text style={{ color: colors.primaryForeground, fontWeight: '700' }}>
          {join.status === 'signed-out' ? 'Log in to join' : declined ? 'Ask again' : 'Join group'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 60 },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 12 },
  iconBtn: { padding: 6 },
  groupIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { fontSize: 18, fontWeight: '700' },
  emptyTitle: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  joinBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  smallBtn: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 },
  toggleWrap: { paddingHorizontal: 20, marginBottom: 8 },
  toggle: { alignSelf: 'flex-start', flexDirection: 'row', borderRadius: 999, padding: 4 },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  body: { paddingHorizontal: 20, paddingBottom: 60 },
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  sheet: { borderWidth: 1, borderRadius: 18, padding: 18 },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 10, marginBottom: 8 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
});
