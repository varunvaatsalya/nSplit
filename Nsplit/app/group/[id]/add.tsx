import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { ExpenseForm } from '@/components/expenses/expense-form';
import { useColors } from '@/hooks/use-colors';
import { apiFetch, errorMessage } from '@/src/api/client';
import type { Expense, GroupDetail } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';

export default function AddExpenseScreen() {
  const { id, expenseId } = useLocalSearchParams<{ id: string; expenseId?: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useColors();
  const { user } = useAuth();
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
      const gRes = await apiFetch<{ group: GroupDetail }>(`/api/groups/${id}`);
      if (!gRes.ok || !gRes.data?.group) {
        setError(errorMessage(gRes.error, 'Failed to load group'));
        return;
      }
      setGroup(gRes.data.group);
      if (expenseId) {
        const eRes = await apiFetch<{ expense: Expense }>(
          `/api/groups/${id}/expenses/${expenseId}`
        );
        if (!eRes.ok || !eRes.data?.expense) {
          setError(errorMessage(eRes.error, 'Failed to load expense'));
          return;
        }
        setExpense(eRes.data.expense);
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
      expense={expense}
      onSaved={() => router.back()}
    />
  );
}
