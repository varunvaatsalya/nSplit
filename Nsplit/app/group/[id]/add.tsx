import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ExpenseForm } from '@/components/expenses/expense-form';
import { RecordTypeTabs, type RecordTab } from '@/components/records/record-type-tabs';
import { TransferForm } from '@/components/transfers/transfer-form';
import { useColors } from '@/hooks/use-colors';
import type { Expense, GroupDetail, Transfer } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import { getExpense } from '@/src/db/expenses';
import { getGroup } from '@/src/db/groups';
import { getTransfer } from '@/src/db/transfers';
import { useIdentity } from '@/src/identity/identity-context';

export default function AddExpenseScreen() {
  const { id, expenseId, transferId } = useLocalSearchParams<{
    id: string;
    expenseId?: string;
    transferId?: string;
  }>();
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useColors();
  const { user } = useAuth();
  const { name: myName, matchByName } = useIdentity();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<RecordTab>('expense');

  const isExpenseEdit = Boolean(expenseId);
  const isTransferEdit = Boolean(transferId);
  const isEdit = isExpenseEdit || isTransferEdit;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: isExpenseEdit
        ? 'Edit expense'
        : isTransferEdit
          ? 'Edit transfer'
          : tab === 'transfer'
            ? 'Add transfer'
            : 'Add expense',
    });
  }, [navigation, isExpenseEdit, isTransferEdit, tab]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const local = await getGroup(String(id));
      if (!local) {
        setError('Group not found');
        return;
      }
      setGroup(local);
      if (expenseId) {
        const item = await getExpense(local._id, String(expenseId));
        if (!item) {
          setError('Expense not found');
          return;
        }
        setExpense(item);
      }
      if (transferId) {
        const item = await getTransfer(local._id, String(transferId));
        if (!item) {
          setError('Transfer not found');
          return;
        }
        setTransfer(item);
      }
    })();
  }, [id, expenseId, transferId]);

  if (!group || (isExpenseEdit && !expense) || (isTransferEdit && !transfer)) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        {error ? (
          <Text style={{ color: colors.danger, padding: 20 }}>{error}</Text>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {isEdit ? null : (
        <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, paddingHorizontal: 12, paddingVertical: 8 }}>
          <RecordTypeTabs value={tab} onChange={setTab} />
        </View>
      )}
      {isTransferEdit || (tab === 'transfer' && !isExpenseEdit) ? (
        <TransferForm
          group={group}
          currentUserId={user?._id}
          transfer={transfer}
          onSaved={() => router.back()}
        />
      ) : (
        <ExpenseForm
          group={group}
          currentUserId={user?._id}
          myName={myName || user?.name}
          matchByName={matchByName}
          myMemberId={group.myMembershipId}
          expense={expense}
          onSaved={() => router.back()}
        />
      )}
    </View>
  );
}
