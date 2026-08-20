import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '@/components/settings/settings-header';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PrimaryButton } from '@/components/ui/primary-button';
import { UserAvatar } from '@/components/user-avatar';
import { useColors } from '@/hooks/use-colors';
import type { GroupDetail, GroupMember } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import {
  addGroupMember,
  getGroup,
  removeGroupMember,
  renameGroupMember,
  setGroupMyMember,
} from '@/src/db/groups';
import { useIdentity } from '@/src/identity/identity-context';
import { memberListLabel, resolveMyMember, sortMembersByName } from '@/src/lib/members';

export default function ManageMembersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const { name: myName, matchByName } = useIdentity();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [editMember, setEditMember] = useState<GroupMember | null>(null);
  const [editName, setEditName] = useState('');
  const [savingMember, setSavingMember] = useState(false);
  const [removeMember, setRemoveMember] = useState<GroupMember | null>(null);
  const [removing, setRemoving] = useState(false);

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

  const members = useMemo(() => sortMembersByName(group?.members || []), [group?.members]);
  const myMember = resolveMyMember(members, {
    userId: user?._id,
    myName,
    matchByName,
    myMemberId: group?.myMembershipId,
  });

  async function addMember() {
    if (!group || !newMemberName.trim()) return;
    setAddingMember(true);
    try {
      await addGroupMember(group._id, newMemberName);
      setNewMemberName('');
      await load();
    } catch {
      setError('Could not add member');
    } finally {
      setAddingMember(false);
    }
  }

  async function saveEditedMember() {
    if (!group || !editMember || !editName.trim()) return;
    setSavingMember(true);
    try {
      await renameGroupMember(group._id, editMember._id, editName);
      setEditMember(null);
      await load();
    } catch {
      setError('Could not update member');
    } finally {
      setSavingMember(false);
    }
  }

  function requestRemove(member: GroupMember) {
    if (members.length <= 1) {
      setError('A group needs at least one member.');
      return;
    }
    setRemoveMember(member);
  }

  async function confirmRemove() {
    if (!group || !removeMember) return;
    setRemoving(true);
    try {
      await removeGroupMember(group._id, removeMember._id);
      setRemoveMember(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not remove member');
    } finally {
      setRemoving(false);
    }
  }

  if (!group) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <SettingsHeader title="Manage members" />
        {error ? <Text style={{ color: colors.danger, padding: 20 }}>{error}</Text> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SettingsHeader title="Manage members" />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

          <Text style={[styles.section, { color: colors.textSecondary }]}>You in this group</Text>
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              This member is you for balances and default payer.
            </Text>
            {members.map((member) => {
              const active = myMember?._id === member._id;
              return (
                <Pressable
                  key={member._id}
                  onPress={async () => {
                    await setGroupMyMember(group._id, member._id);
                    await load();
                  }}
                  className="flex-row items-center gap-2.5"
                  style={[styles.memberRow, active && { backgroundColor: colors.softSurface }]}>
                  <UserAvatar
                    name={memberListLabel(member, user?._id, myMember?._id)}
                    avatar={member.avatar}
                    seed={member.userId || member._id}
                    size={32}
                  />
                  <Text style={{ flex: 1, color: colors.text, fontWeight: active ? '700' : '500' }} numberOfLines={1}>
                    {memberListLabel(member, user?._id, myMember?._id)}
                  </Text>
                  {active ? <MaterialIcons name="check" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
            <Pressable
              onPress={async () => {
                await setGroupMyMember(group._id, null);
                await load();
              }}
              style={styles.memberRow}>
              <Text style={{ color: colors.textSecondary }}>Don’t mark anyone</Text>
            </Pressable>
          </View>

          <Text style={[styles.section, { color: colors.textSecondary }]}>Members</Text>
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            {members.map((member) => (
              <View key={member._id} className="flex-row items-center gap-2.5" style={styles.memberRow}>
                <UserAvatar
                  name={memberListLabel(member, user?._id, myMember?._id)}
                  avatar={member.avatar}
                  seed={member.userId || member._id}
                  size={32}
                />
                <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                  {memberListLabel(member, user?._id, myMember?._id)}
                </Text>
                <Pressable
                  onPress={() => {
                    setEditMember(member);
                    setEditName(member.displayName || '');
                  }}
                  hitSlop={8}
                  style={styles.iconBtn}>
                  <MaterialIcons name="edit" size={18} color={colors.textSecondary} />
                </Pressable>
                <Pressable onPress={() => requestRemove(member)} hitSlop={8} style={styles.iconBtn}>
                  <MaterialIcons name="delete-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            ))}
            <View className="flex-row items-center gap-2" style={{ paddingTop: 4 }}>
              <TextInput
                value={newMemberName}
                onChangeText={setNewMemberName}
                placeholder="Add member name"
                placeholderTextColor={colors.textSecondary}
                onSubmitEditing={addMember}
                style={[
                  styles.input,
                  { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                ]}
              />
              <Pressable
                onPress={addMember}
                disabled={addingMember || !newMemberName.trim()}
                style={[
                  styles.addBtn,
                  { backgroundColor: colors.primary, opacity: newMemberName.trim() ? 1 : 0.45 },
                ]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>+</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={Boolean(editMember)} transparent animationType="fade" onRequestClose={() => setEditMember(null)}>
        <View style={styles.overlay}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: colors.overlay }]}
            onPress={() => setEditMember(null)}
          />
          <View style={[styles.sheet, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Edit member</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              style={[
                styles.input,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
              ]}
            />
            <View className="flex-row gap-2" style={{ marginTop: 12 }}>
              <Pressable
                onPress={() => setEditMember(null)}
                style={[styles.ghostBtn, { borderColor: colors.border, flex: 1 }]}>
                <Text style={{ color: colors.text, fontWeight: '600', textAlign: 'center' }}>Cancel</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title={savingMember ? 'Saving…' : 'Save'}
                  loading={savingMember}
                  disabled={!editName.trim()}
                  onPress={saveEditedMember}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmDialog
        open={Boolean(removeMember)}
        onOpenChange={(open) => {
          if (!open) setRemoveMember(null);
        }}
        title="Remove member?"
        description={`${memberListLabel(removeMember || { displayName: 'This member' }, user?._id, myMember?._id)} will be removed from this group.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        tone="danger"
        loading={removing}
        onConfirm={confirmRemove}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 40, gap: 10 },
  section: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  memberRow: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  iconBtn: { padding: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  ghostBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    justifyContent: 'center',
  },
});
