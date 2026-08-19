import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { ExpenseForm } from '@/components/expenses/expense-form';
import { useColors } from '@/hooks/use-colors';
import type { Expense, GroupDetail } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import { getExpense } from '@/src/db/expenses';
import { getGroup } from '@/src/db/groups';
import { useIdentity } from '@/src/identity/identity-context';

export default function AddExpenseScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useColors();
  const { user } = useAuth();
  const { name: myName, matchByName } = useIdentity();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expense, setExpense] = useState<Expense | null>(null);
  const [error, setError] = useState('');

  const isEdit = Boolean(expenseId);

  useLayoutEffect(() => {
    navigation.setOptions({ title: isEdit ? 'Edit expense' : 'Add expense' });
  }, [navigation, isEdit]);

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
    })();
  }, [id, expenseId]);

  if (!group || (isEdit && !expense)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        {error ? (
          <Text style={{ color: colors.danger, padding: 20 }}>{error}</Text>
        ) : (
          <ActivityIndicator color={colors.primary} />
        )}
      </View>
    );
  }

  return (
    <ExpenseForm
      group={group}
      currentUserId={user?._id}
      myName={myName || user?.name}
      matchByName={matchByName}
      myMemberId={group.myMembershipId}
      expense={expense}
      onSaved={() => router.back()}
    />
  );
}
