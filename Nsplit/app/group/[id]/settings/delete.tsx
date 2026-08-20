import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '@/components/settings/settings-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useColors } from '@/hooks/use-colors';
import type { GroupDetail } from '@/src/api/types';
import { deleteGroup, getGroup } from '@/src/db/groups';
import { useGroups } from '@/src/groups/groups-context';

export default function DeleteGroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { reload: reloadGroups } = useGroups();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const local = await getGroup(String(id));
    if (!local) {
      setError('Group not found');
      setGroup(null);
      return;
    }
    setError('');
    setGroup(local);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function confirmDelete() {
    if (!group || deleting) return;
    setDeleting(true);
    try {
      await deleteGroup(group._id);
      await reloadGroups();
      setConfirmOpen(false);
      router.replace('/');
    } catch {
      setError('Could not delete group');
      setDeleting(false);
    }
  }

  if (!group) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <SettingsHeader title="Delete group" />
        {error ? <Text style={{ color: colors.danger, padding: 20 }}>{error}</Text> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <SettingsHeader title="Delete group" />
      <ScrollView contentContainerStyle={styles.body}>
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        <Text style={[styles.heading, { color: colors.text }]}>Delete “{group.name}”?</Text>
        <Text style={[styles.copy, { color: colors.textSecondary }]}>
          This permanently removes the group from this device. You will lose the shared history
          for everyone using this local copy.
        </Text>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>What gets deleted</Text>
          <Text style={[styles.copy, { color: colors.textSecondary }]}>
            • All expenses and how they were split{'\n'}
            • All transfers between members{'\n'}
            • Member list and “you in this group”{'\n'}
            • Group name, icon, currency, and default split
          </Text>
        </View>

        <View style={[styles.card, { borderColor: colors.danger, backgroundColor: colors.surface }]}>
          <Text style={[styles.cardTitle, { color: colors.danger }]}>This cannot be undone</Text>
          <Text style={[styles.copy, { color: colors.textSecondary }]}>
            Balances cannot be recovered after delete. If you only want to leave the list, go back
            and keep the group. If you are sure, confirm on the next step.
          </Text>
        </View>

        <Pressable
          onPress={() => setConfirmOpen(true)}
          style={[styles.deleteBtn, { backgroundColor: colors.danger }]}>
          <Text style={styles.deleteBtnText}>Delete this group</Text>
        </Pressable>
      </ScrollView>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete this group?"
        description={`“${group.name}” and all of its expenses and transfers will be removed on this device. This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Keep group"
        tone="danger"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  heading: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  copy: { fontSize: 14, lineHeight: 21 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  deleteBtn: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
