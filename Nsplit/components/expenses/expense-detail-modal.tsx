import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

import { UserAvatar } from '@/components/user-avatar';
import { useColors } from '@/hooks/use-colors';
import type { Expense, GroupDetail, GroupMember } from '@/src/api/types';
import { deleteExpense } from '@/src/db/expenses';
import { formatMinor } from '@/src/lib/format';
import { getExpenseEmoji } from '@/src/lib/icons';
import { memberListLabel, sortMembersByName } from '@/src/lib/members';

const SPLIT_LABELS: Record<string, string> = {
  EQUAL: 'Equally',
  EXACT: 'As amount',
  SHARES: 'As parts',
};

function memberById(members: GroupMember[], id: string) {
  return members.find((m) => m._id === id);
}

function formatDetailWhen(expense: Expense) {
  const raw = expense.expenseDate || expense.createdAt;
  const d = new Date(raw || '');
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function ExpenseDetailPage({
  expense,
  group,
  currentUserId,
  myMemberId,
  onEdit,
  onDeleted,
}: {
  expense: Expense;
  group: GroupDetail;
  currentUserId?: string | null;
  myMemberId?: string | null;
  onEdit: (expense: Expense) => void;
  onDeleted: () => void;
}) {
  const colors = useColors();
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const members = sortMembersByName(group?.members || []);
  const currency = expense.currency || group?.currency || 'INR';
  const payers = [...(expense.payers || [])];
  const splits = (expense.splits || []).filter((s) => (s.amountMinor || 0) > 0);

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteExpense(group._id, expense._id);
      setConfirmOpen(false);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.body}
      nestedScrollEnabled>
      <View style={styles.headRow}>
        <View style={[styles.emoji, { backgroundColor: colors.softSurface }]}>
          <Text style={{ fontSize: 28 }}>{getExpenseEmoji(expense.icon, expense.categoryKey)}</Text>
        </View>
        <View className="flex-row gap-1">
          <Pressable onPress={() => onEdit(expense)} style={styles.iconHit} hitSlop={8}>
            <MaterialIcons name="edit" size={20} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => setConfirmOpen(true)}
            disabled={deleting}
            style={styles.iconHit}
            hitSlop={8}>
            <MaterialIcons name="delete" size={20} color={colors.danger} />
          </Pressable>
        </View>
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{expense.title}</Text>
      <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{formatDetailWhen(expense)}</Text>
      <View style={styles.amountRow}>
        <Text style={[styles.amount, { color: colors.text }]}>
          {formatMinor(expense.amountMinor, currency)}
        </Text>
        <View style={[styles.kindBadge, { backgroundColor: colors.softSurface }]}>
          <Text style={[styles.kindBadgeText, { color: colors.textSecondary }]}>Expense</Text>
        </View>
      </View>

      <Text style={[styles.section, { color: colors.textSecondary }]}>PAID BY</Text>
      {payers.map((p) => {
        const m = memberById(members, p.memberId);
        const name = memberListLabel(m || { displayName: 'Member' }, currentUserId, myMemberId);
        return (
          <View key={p.memberId} style={styles.row}>
            <UserAvatar
              name={name}
              avatar={m?.avatar || m?.user?.avatar}
              seed={m?.userId || m?._id || p.memberId}
              size={32}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {payers.length === 1 ? 'Paid full amount' : 'Paid part'}
              </Text>
            </View>
            <Text style={{ color: colors.text, fontWeight: '600' }}>
              {formatMinor(p.amountMinor, currency)}
            </Text>
          </View>
        );
      })}

      <View style={styles.splitLabel}>
        <Text style={[styles.section, { color: colors.textSecondary, marginTop: 0 }]}>
          SPLIT WITH ({splits.length})
        </Text>
        <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: '700' }}>
          {SPLIT_LABELS[expense.splitMethod || ''] || expense.splitMethod}
        </Text>
      </View>
      {splits.map((s) => {
        const m = memberById(members, s.memberId);
        const name = memberListLabel(m || { displayName: 'Member' }, currentUserId, myMemberId);
        const isYou = Boolean(myMemberId && s.memberId === myMemberId);
        return (
          <View key={s.memberId} style={styles.row}>
            <UserAvatar
              name={name}
              avatar={m?.avatar || m?.user?.avatar}
              seed={m?.userId || m?._id || s.memberId}
              size={32}
            />
            <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>{name}</Text>
            <Text style={{ color: isYou ? colors.primary : colors.text, fontWeight: '600' }}>
              {formatMinor(s.amountMinor, currency)}
            </Text>
          </View>
        );
      })}

      {expense.description ? (
        <View style={{ marginTop: 12 }}>
          <Text style={[styles.section, { color: colors.textSecondary }]}>DESCRIPTION</Text>
          <Text style={{ color: colors.text, lineHeight: 20 }}>{expense.description}</Text>
        </View>
      ) : null}

      <View style={[styles.added, { borderTopColor: colors.border }]}>
        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Added on</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }} numberOfLines={1}>
          {formatDetailWhen(expense)}
        </Text>
      </View>
    </ScrollView>
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title="Delete expense?"
      description={`“${expense.title}” will be removed from this group. This cannot be undone.`}
      confirmLabel="Delete"
      cancelLabel="Cancel"
      tone="danger"
      loading={deleting}
      onConfirm={confirmDelete}
    />
    </>
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
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 10,
    marginBottom: 16,
  },
  amount: { fontSize: 32, fontWeight: '700', flexShrink: 1 },
  kindBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  kindBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 16, marginBottom: 8 },
  splitLabel: {
    marginTop: 16,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
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
