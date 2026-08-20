import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { UserAvatar } from '@/components/user-avatar';
import { useColors } from '@/hooks/use-colors';
import type { GroupDetail, GroupMember, Transfer } from '@/src/api/types';
import { deleteTransfer } from '@/src/db/transfers';
import { formatMinor } from '@/src/lib/format';
import { memberListLabel, sortMembersByName } from '@/src/lib/members';

function memberById(members: GroupMember[], id?: string | null) {
  if (!id) return undefined;
  return members.find((m) => m._id === id);
}

function formatDetailWhen(transfer: Transfer) {
  const raw = transfer.transferDate || transfer.createdAt;
  const d = new Date(raw || '');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function MemberBlock({
  label,
  member,
  fallbackId,
  currentUserId,
  myMemberId,
  colors,
}: {
  label: string;
  member?: GroupMember;
  fallbackId?: string;
  currentUserId?: string | null;
  myMemberId?: string | null;
  colors: ReturnType<typeof useColors>;
}) {
  const name = memberListLabel(member || { displayName: 'Member' }, currentUserId, myMemberId);
  return (
    <>
      <Text style={[styles.section, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.row}>
        <UserAvatar
          name={name}
          avatar={member?.avatar || member?.user?.avatar}
          seed={member?.userId || member?._id || fallbackId}
          size={32}
        />
        <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{name}</Text>
      </View>
    </>
  );
}

export function TransferDetailPage({
  transfer,
  group,
  currentUserId,
  myMemberId,
  onEdit,
  onDeleted,
}: {
  transfer: Transfer;
  group: GroupDetail;
  currentUserId?: string | null;
  myMemberId?: string | null;
  onEdit: (transfer: Transfer) => void;
  onDeleted: () => void;
}) {
  const colors = useColors();
  const [deleting, setDeleting] = useState(false);
  const members = sortMembersByName(group?.members || []);
  const currency = transfer.currency || group?.currency || 'INR';
  const from = memberById(members, transfer.fromMemberId);
  const to = memberById(members, transfer.toMemberId);

  async function confirmDelete() {
    Alert.alert(
      'Delete transfer?',
      `“${transfer.title || 'Transfer'}” will be removed from this group. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteTransfer(group._id, transfer._id);
              onDeleted();
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.body}
      nestedScrollEnabled>
      <View style={styles.headRow}>
        <View style={[styles.emoji, { backgroundColor: colors.softSurface }]}>
          <Text style={{ fontSize: 28 }}>{transfer.icon || '💸'}</Text>
        </View>
        <View className="flex-row gap-1">
          <Pressable onPress={() => onEdit(transfer)} style={styles.iconHit} hitSlop={8}>
            <MaterialIcons name="edit" size={20} color={colors.text} />
          </Pressable>
          <Pressable onPress={confirmDelete} disabled={deleting} style={styles.iconHit} hitSlop={8}>
            <MaterialIcons name="delete" size={20} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{transfer.title || 'Transfer'}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{formatDetailWhen(transfer)}</Text>
      <Text style={[styles.amount, { color: colors.text }]}>
        {formatMinor(transfer.amountMinor, currency)}
      </Text>

      <MemberBlock
        label="FROM"
        member={from}
        fallbackId={transfer.fromMemberId}
        currentUserId={currentUserId}
        myMemberId={myMemberId}
        colors={colors}
      />
      <MemberBlock
        label="TRANSFERRED TO"
        member={to}
        fallbackId={transfer.toMemberId}
        currentUserId={currentUserId}
        myMemberId={myMemberId}
        colors={colors}
      />

      <View style={[styles.added, { borderTopColor: colors.border }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Added on</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }} numberOfLines={1}>
          {formatDetailWhen(transfer)}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  headRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  emoji: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconHit: { padding: 8 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 12 },
  amount: { fontSize: 32, fontWeight: '700', marginTop: 10, marginBottom: 16 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  added: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
