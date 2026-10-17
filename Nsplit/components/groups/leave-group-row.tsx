import Feather from '@expo/vector-icons/Feather';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useColors } from '@/hooks/use-colors';
import { apiFetch, errorMessage } from '@/src/api/client';
import type { GroupDetail } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import { forgetGroupLocally } from '@/src/db/groups';
import { useGroups } from '@/src/groups/groups-context';

/** True when you're in this group with your account (so you can leave it). */
export function useCanLeaveGroup(group: GroupDetail | null) {
  const { user } = useAuth();
  return Boolean(user && group?.members?.some((m) => m.userId === user._id));
}

/**
 * A row for the group's danger zone: "Leave group" for people in the group with their account. Needs internet: the
 * server checks you're not the last admin before letting you go.
 */
export function LeaveGroupRow({ group, style }: { group: GroupDetail; style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { reload } = useGroups();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const joined = useCanLeaveGroup(group);
  if (!joined || !user) return null;

  async function leave() {
    setLeaving(true);
    try {
      const res = await apiFetch(`/api/groups/${group.code}/leave`, { method: 'POST' });
      if (!res.ok) {
        setConfirmOpen(false);
        Alert.alert('Could not leave', errorMessage(res.error, 'Please try again.'));
        return;
      }
      await forgetGroupLocally(group._id);
      setConfirmOpen(false);
      await reload().catch(() => {});
      router.replace('/');
    } finally {
      setLeaving(false);
    }
  }

  return (
    <>
      <Pressable onPress={() => setConfirmOpen(true)} style={[styles.row, style]}>
        <Feather name="log-out" size={18} color={colors.danger} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.danger, fontWeight: '700' }}>Leave group</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>
            You won’t see this group anymore
          </Text>
        </View>
      </Pressable>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={(open) => !leaving && setConfirmOpen(open)}
        title="Leave this group?"
        description={`You’ll stop seeing “${group.name}”. Expenses you’re part of stay in the group.`}
        confirmLabel="Leave group"
        cancelLabel="Cancel"
        loading={leaving}
        onConfirm={() => void leave()}
      />
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
});
