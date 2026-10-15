import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '@/components/settings/settings-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useColors } from '@/hooks/use-colors';
import { apiFetch } from '@/src/api/client';
import type { GroupDetail } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import { getGroup, isGroupSynced } from '@/src/db/groups';
import { useOffline } from '@/src/offline/offline-context';
import { useSync } from '@/src/sync/sync-context';

type ShareInfo = { token: string | null; url: string | null };

type Status =
  | { kind: 'loading' }
  | { kind: 'signed-out' }
  | { kind: 'offline' }
  | { kind: 'not-synced' }
  | { kind: 'forbidden' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; share: ShareInfo };

const CAN_SEE = [
  'Every expense and payment, with who paid and each person’s share',
  'Balances and suggested settlements',
  'Each member’s UPI ID, with a “Pay via UPI” button',
];
const CANNOT = ['Edit or delete anything', 'See emails or phone numbers'];

export default function ShareGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { online } = useOffline();
  const { syncNow } = useSync();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [status, setStatus] = useState<Status>({ kind: 'loading' });
  const [busy, setBusy] = useState<'create' | 'rotate' | 'off' | null>(null);
  const [confirm, setConfirm] = useState<'rotate' | 'off' | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const local = await getGroup(String(id));
    setGroup(local);
    if (!local) return setStatus({ kind: 'error', message: 'Group not found' });
    if (!user) return setStatus({ kind: 'signed-out' });
    if (!online) return setStatus({ kind: 'offline' });
    if (!(await isGroupSynced(local._id))) {
      // Push it now; the link only works once the server has the group.
      await syncNow().catch(() => {});
      if (!(await isGroupSynced(local._id))) return setStatus({ kind: 'not-synced' });
    }
    const res = await apiFetch<{ share: ShareInfo }>(`/api/groups/${local.code}/share`);
    if (res.status === 403) return setStatus({ kind: 'forbidden' });
    if (!res.ok || !res.data) {
      return setStatus({ kind: 'error', message: res.error?.message || 'Could not load the share link' });
    }
    setStatus({ kind: 'ready', share: res.data.share });
  }, [id, user, online, syncNow]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => setStatus({ kind: 'error', message: 'Could not load the share link' }));
    }, [load])
  );

  async function change(kind: 'create' | 'rotate' | 'off') {
    if (!group || busy) return;
    setBusy(kind);
    try {
      const res = await apiFetch<{ share: ShareInfo }>(`/api/groups/${group.code}/share`, {
        method: kind === 'off' ? 'DELETE' : 'POST',
        body: kind === 'rotate' ? JSON.stringify({ rotate: true }) : undefined,
      });
      if (!res.ok || !res.data) {
        setStatus({ kind: 'error', message: res.error?.message || 'Could not update the link' });
        return;
      }
      setStatus({ kind: 'ready', share: res.data.share });
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  }

  async function shareLink(url: string) {
    await Share.share({
      message: `${group?.name || 'Our group'}: see the full hisaab and what you owe on nSplit\n${url}`,
    });
  }

  const missingUpi = (group?.members || []).filter((m) => !m.upiId).length;

  function Notice({ icon, title, body, action }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; body: string; action?: React.ReactNode }) {
    return (
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center' }]}>
        <MaterialIcons name={icon} size={28} color={colors.textSecondary} />
        <Text style={[styles.cardTitle, { color: colors.text, marginTop: 8 }]}>{title}</Text>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 19 }}>{body}</Text>
        {action ? <View style={{ alignSelf: 'stretch', marginTop: 14 }}>{action}</View> : null}
      </View>
    );
  }

  function body() {
    switch (status.kind) {
      case 'loading':
        return <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />;
      case 'signed-out':
        return (
          <Notice
            icon="cloud-off"
            title="Log in to share"
            body="Sharing needs this group backed up to your account."
            action={<PrimaryButton title="Log in" onPress={() => router.push('/login')} />}
          />
        );
      case 'offline':
        return <Notice icon="wifi-off" title="You are offline" body="Connect to the internet to create or change the link." />;
      case 'not-synced':
        return (
          <Notice
            icon="sync"
            title="Still backing up this group"
            body="The link works once the group reaches the server. Try again in a moment."
            action={<PrimaryButton title="Try again" onPress={() => void load()} />}
          />
        );
      case 'forbidden':
        return <Notice icon="lock-outline" title="Only group admins can share" body="Ask the person who created this group." />;
      case 'error':
        return (
          <Notice
            icon="error-outline"
            title="Something went wrong"
            body={status.message}
            action={<PrimaryButton title="Try again" onPress={() => void load()} />}
          />
        );
      case 'ready': {
        const url = status.share.url;
        return (
          <>
            {url ? (
              <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <View style={styles.liveRow}>
                  <View style={[styles.dot, { backgroundColor: colors.success }]} />
                  <Text style={{ color: colors.success, fontWeight: '700', fontSize: 13 }}>Link is on</Text>
                </View>
                <Text selectable style={[styles.url, { color: colors.text, backgroundColor: colors.softSurface }]}>
                  {url}
                </Text>
                <PrimaryButton title="Share link" onPress={() => void shareLink(url)} />
                <View style={styles.row}>
                  <Pressable
                    onPress={() => setConfirm('rotate')}
                    style={[styles.ghostBtn, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.text, fontWeight: '600' }}>New link</Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirm('off')} style={[styles.ghostBtn, { borderColor: colors.danger }]}>
                    <Text style={{ color: colors.danger, fontWeight: '600' }}>Turn off</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>Share a read-only link</Text>
                <Text style={{ color: colors.textSecondary, marginTop: 4, marginBottom: 14, lineHeight: 19 }}>
                  Friends open it in any browser, no app or login needed. They pick their name and see what they owe.
                </Text>
                <PrimaryButton
                  title={busy === 'create' ? 'Creating…' : 'Create link'}
                  loading={busy === 'create'}
                  onPress={() => void change('create')}
                />
              </View>
            )}

            {missingUpi ? (
              <Pressable
                onPress={() => router.push({ pathname: '/group/[id]/settings/members', params: { id: String(id) } })}
                style={[styles.card, styles.upiNote, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <MaterialIcons name="currency-rupee" size={20} color={colors.primary} />
                <Text style={{ flex: 1, color: colors.text, lineHeight: 19 }}>
                  {missingUpi} member{missingUpi === 1 ? ' has' : 's have'} no UPI ID. Add one so others can pay them
                  straight from the link.
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </>
        );
      }
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <SettingsHeader title="Share link" />
      <ScrollView contentContainerStyle={styles.body}>
        {body()}

        <Text style={[styles.section, { color: colors.textSecondary }]}>ANYONE WITH THE LINK CAN</Text>
        {CAN_SEE.map((line) => (
          <View key={line} style={styles.bullet}>
            <MaterialIcons name="check" size={16} color={colors.success} />
            <Text style={{ flex: 1, color: colors.text, lineHeight: 19 }}>{line}</Text>
          </View>
        ))}
        <Text style={[styles.section, { color: colors.textSecondary }]}>THEY CANNOT</Text>
        {CANNOT.map((line) => (
          <View key={line} style={styles.bullet}>
            <MaterialIcons name="close" size={16} color={colors.danger} />
            <Text style={{ flex: 1, color: colors.text, lineHeight: 19 }}>{line}</Text>
          </View>
        ))}
        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 14, lineHeight: 17 }}>
          Only share it with people in this group. If it reaches the wrong person, tap “New link”: the old one
          stops working right away.
        </Text>
      </ScrollView>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setConfirm(null);
        }}
        title={confirm === 'off' ? 'Turn off the link?' : 'Make a new link?'}
        description={
          confirm === 'off'
            ? 'Anyone with the current link will lose access right away. You can turn sharing on again later.'
            : 'The current link will stop working right away. Send the new one to your group.'
        }
        confirmLabel={confirm === 'off' ? 'Turn off' : 'New link'}
        cancelLabel="Cancel"
        tone={confirm === 'off' ? 'danger' : 'default'}
        loading={busy === 'off' || busy === 'rotate'}
        onConfirm={() => void change(confirm === 'off' ? 'off' : 'rotate')}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 4 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  url: { borderRadius: 12, padding: 12, marginVertical: 12, fontSize: 13 },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  ghostBtn: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upiNote: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 22, marginBottom: 8 },
  bullet: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
});
