import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export function ExpenseDetailModal({
  open,
  onClose,
  expenses,
  index,
  onIndexChange,
  group,
  currentUserId,
  myMemberId,
  onEdit,
  onDeleted,
}: {
  open: boolean;
  onClose: () => void;
  expenses: Expense[];
  index: number;
  onIndexChange: (next: number) => void;
  group: GroupDetail;
  currentUserId?: string | null;
  myMemberId?: string | null;
  onEdit: (expense: Expense) => void;
  onDeleted: () => void;
}) {
  const colors = useColors();
  const [deleting, setDeleting] = useState(false);
  const expense = expenses[index] || null;
  const members = sortMembersByName(group?.members || []);
  const currency = expense?.currency || group?.currency || 'INR';
  const total = expenses.length;
  const canPrev = index > 0;
  const canNext = index < total - 1;

  if (!expense) return null;

  const canMutate = true;
  const payers = [...(expense.payers || [])];
  const splits = (expense.splits || []).filter((s) => (s.amountMinor || 0) > 0);
  const creator = members.find(
    (m) => m.userId && String(m.userId) === String(expense.createdById)
  );
  const creatorName = creator ? memberListLabel(creator, currentUserId, myMemberId) : 'Someone';

  async function confirmDelete() {
    Alert.alert(
      'Delete expense?',
      `“${expense.title}” will be removed from this group. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteExpense(group._id, expense._id);
              onDeleted();
              onClose();
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.top}>
          <Pressable onPress={onClose} hitSlop={8}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </Pressable>
          <View style={styles.nav}>
            <Pressable disabled={!canPrev} onPress={() => onIndexChange(index - 1)} hitSlop={8}>
              <MaterialIcons
                name="chevron-left"
                size={28}
                color={canPrev ? colors.text : colors.border}
              />
            </Pressable>
            <Pressable disabled={!canNext} onPress={() => onIndexChange(index + 1)} hitSlop={8}>
              <MaterialIcons
                name="chevron-right"
                size={28}
                color={canNext ? colors.text : colors.border}
              />
            </Pressable>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.headRow}>
            <View style={[styles.emoji, { backgroundColor: colors.softSurface }]}>
              <Text style={{ fontSize: 28 }}>{getExpenseEmoji(expense.icon, expense.categoryKey)}</Text>
            </View>
            {canMutate ? (
              <View style={{ flexDirection: 'row', gap: 4 }}>
                <Pressable onPress={() => onEdit(expense)} style={styles.iconHit} hitSlop={8}>
                  <MaterialIcons name="edit" size={20} color={colors.text} />
                </Pressable>
                <Pressable onPress={confirmDelete} disabled={deleting} style={styles.iconHit} hitSlop={8}>
                  <MaterialIcons name="delete" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ) : null}
          </View>

          <Text style={[styles.title, { color: colors.text }]}>{expense.title}</Text>
          <Text style={{ color: colors.textSecondary, marginTop: 4 }}>{formatDetailWhen(expense)}</Text>
          <Text style={[styles.amount, { color: colors.text }]}>
            {formatMinor(expense.amountMinor, currency)}
          </Text>

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
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Added by</Text>
            <UserAvatar
              name={creatorName}
              avatar={creator?.avatar || creator?.user?.avatar}
              seed={creator?.userId || creator?._id || expense.createdById}
              size={18}
            />
            <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }} numberOfLines={1}>
              · {formatDetailWhen(expense)}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  nav: { flexDirection: 'row', gap: 8 },
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
