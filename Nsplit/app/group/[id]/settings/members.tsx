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
  Switch,
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
  updateGroupMember,
  setGroupMyMember,
} from '@/src/db/groups';
import { apiFetch, errorMessage } from '@/src/api/client';
import { useIdentity } from '@/src/identity/identity-context';
import { useSync } from '@/src/sync/sync-context';
import { memberListLabel, resolveMyMember, sortMembersByName } from '@/src/lib/members';

export default function ManageMembersScreen() {
  const { id, add } = useLocalSearchParams<{ id: string; add?: string }>();
  const colors = useColors();
  const { user } = useAuth();
  const { name: myName, matchByName } = useIdentity();
  const { syncNow } = useSync();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [editMember, setEditMember] = useState<GroupMember | null>(null);
  const [editName, setEditName] = useState('');
  const [editError, setEditError] = useState('');
  const [editIsMe, setEditIsMe] = useState(false);
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

  // With your account linked, you are that member; choosing "me" only applies to groups without it.
  const accountLinked = Boolean(user && members.some((m) => m.userId === user._id));

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
      await updateGroupMember(group._id, editMember._id, { name: editName });
      const wasMe = myMember?._id === editMember._id;
      if (!accountLinked && editIsMe !== wasMe) {
        await setGroupMyMember(group._id, editIsMe ? editMember._id : null);
      }
      setEditMember(null);
      await load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : 'Could not update member');
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
      if (removeMember.userId) {
        // Someone who joined with an account: the server removes them (and keeps an admin).
        const res = await apiFetch(`/api/groups/${group.code}/members/${removeMember._id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error(errorMessage(res.error, 'Could not remove member'));
        await syncNow().catch(() => {});
      } else {
        await removeGroupMember(group._id, removeMember._id);
      }
      setRemoveMember(null);
      await load();
    } catch (e) {
      setRemoveMember(null);
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
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                    {memberListLabel(member, user?._id, myMember?._id)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => {
                    setEditMember(member);
                    setEditName(member.displayName || '');
                    setEditError('');
                    setEditIsMe(myMember?._id === member._id);
                  }}
                  hitSlop={8}
                  style={styles.iconBtn}>
                  <MaterialIcons name="edit" size={18} color={colors.textSecondary} />
                </Pressable>
                {/* You leave from the group settings instead. */}
                {user && member.userId === user._id ? (
                  <View style={styles.iconBtn} />
                ) : (
                  <Pressable onPress={() => requestRemove(member)} hitSlop={8} style={styles.iconBtn}>
                    <MaterialIcons name="delete-outline" size={20} color={colors.danger} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>

          <Text style={[styles.section, { color: colors.textSecondary }]}>Add member</Text>
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View className="flex-row items-center gap-2">
              <View
                style={[
                  styles.addField,
                  { flex: 1, borderColor: colors.border, backgroundColor: colors.background },
                ]}>
                <MaterialIcons name="person-add-alt-1" size={20} color={colors.textSecondary} />
                <TextInput
                  value={newMemberName}
                  onChangeText={setNewMemberName}
                  placeholder="Name or nickname"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus={add === '1'}
                  returnKeyType="done"
                  onSubmitEditing={addMember}
                  style={{ flex: 1, color: colors.text, fontSize: 15, paddingVertical: 10 }}
                />
              </View>
              <Pressable
                onPress={addMember}
                disabled={addingMember || !newMemberName.trim()}
                style={[
                  styles.addBtn,
                  { backgroundColor: colors.primary, opacity: newMemberName.trim() ? 1 : 0.45 },
                ]}>
                <Text style={{ color: colors.primaryForeground, fontWeight: '700' }}>
                  {addingMember ? 'Adding…' : 'Add'}
                </Text>
              </Pressable>
            </View>
            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>
              Only a name is needed. They can join later with the group link.
            </Text>
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
            {editError ? <Text style={{ color: colors.danger, fontSize: 12, marginTop: 6 }}>{editError}</Text> : null}
            {accountLinked ? (
              user && editMember?.userId === user._id ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 10 }}>
                  This is you. It’s linked to your account.
                </Text>
              ) : null
            ) : (
              <View style={[styles.meRow, { borderColor: colors.border }]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }}>This is me</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                    Used for your balances and as the default payer.
                  </Text>
                </View>
                <Switch value={editIsMe} onValueChange={setEditIsMe} trackColor={{ true: colors.primary }} />
              </View>
            )}
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
  addField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  meRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
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
    minWidth: 64,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  backdrop: { ...StyleSheet.absoluteFill },
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
