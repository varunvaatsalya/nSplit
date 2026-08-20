import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
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

import { EmojiPickerModal } from '@/components/expenses/emoji-picker-modal';
import { PrimaryButton } from '@/components/ui/primary-button';
import { UserAvatar } from '@/components/user-avatar';
import { useColors } from '@/hooks/use-colors';
import type { GroupDetail, GroupMember } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import {
  addGroupMember,
  deleteGroup,
  getGroup,
  removeGroupMember,
  renameGroupMember,
  setGroupMyMember,
  updateGroup,
  updateGroupSettings,
} from '@/src/db/groups';
import { useGroups } from '@/src/groups/groups-context';
import { useIdentity } from '@/src/identity/identity-context';
import { SPLIT_METHODS, normalizeSplitMethod, type SplitMethodValue } from '@/src/lib/expense-form-utils';
import { CURRENCIES, getGroupEmoji } from '@/src/lib/icons';
import { memberListLabel, resolveMyMember, sortMembersByName } from '@/src/lib/members';

function defaultPartsMap(members: GroupMember[], config?: { memberId: string; value: number }[] | null) {
  const map: Record<string, number> = {};
  for (const member of members) map[member._id] = 1;
  if (Array.isArray(config)) {
    for (const row of config) {
      if (row?.memberId && map[row.memberId] != null) {
        const n = Number(row.value);
        map[row.memberId] = Number.isFinite(n) && n >= 1 ? Math.min(99, Math.round(n)) : 1;
      }
    }
  }
  return map;
}

export default function GroupSettingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { name: myName, matchByName } = useIdentity();
  const { reload: reloadGroups } = useGroups();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('👥');
  const [currency, setCurrency] = useState('INR');
  const [savingDetails, setSavingDetails] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);

  const [method, setMethod] = useState<SplitMethodValue>('EQUAL');
  const [splitOpen, setSplitOpen] = useState(false);
  const [draftMethod, setDraftMethod] = useState<SplitMethodValue>('EQUAL');
  const [draftParts, setDraftParts] = useState<Record<string, number>>({});
  const [savingSplit, setSavingSplit] = useState(false);

  const [newMemberName, setNewMemberName] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [editMember, setEditMember] = useState<GroupMember | null>(null);
  const [editName, setEditName] = useState('');
  const [savingMember, setSavingMember] = useState(false);

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
    setName(local.name || '');
    setIcon(local.icon || '👥');
    setCurrency(local.currency || 'INR');
    setMethod(normalizeSplitMethod(local.settings?.defaultSplitMethod));
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

  const selectedCurrency = CURRENCIES.find((item) => item.code === currency) || CURRENCIES[0];
  const methodLabel = SPLIT_METHODS.find((item) => item.value === method)?.label || 'Equally';

  async function saveDetails() {
    if (!group || !name.trim()) {
      setError('Give the group a name');
      return;
    }
    setSavingDetails(true);
    try {
      await updateGroup(group._id, { name: name.trim(), icon, currency });
      await reloadGroups();
      await load();
    } catch {
      setError('Could not save group details');
    } finally {
      setSavingDetails(false);
    }
  }

  function openSplit() {
    setDraftMethod(method);
    setDraftParts(defaultPartsMap(members, group?.settings?.defaultSplitConfig));
    setSplitOpen(true);
  }

  async function saveSplit() {
    if (!group) return;
    setSavingSplit(true);
    try {
      await updateGroupSettings(group._id, {
        defaultSplitMethod: draftMethod,
        defaultSplitConfig:
          draftMethod === 'SHARES'
            ? members.map((m) => ({ memberId: m._id, value: draftParts[m._id] || 1 }))
            : null,
      });
      setSplitOpen(false);
      await load();
    } catch {
      setError('Could not save split method');
    } finally {
      setSavingSplit(false);
    }
  }

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

  function confirmRemove(member: GroupMember) {
    if (members.length <= 1) {
      Alert.alert('Last member', 'A group needs at least one member.');
      return;
    }
    Alert.alert('Remove member?', `${memberListLabel(member, user?._id, myMember?._id)} will be removed from this group.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeGroupMember(group!._id, member._id);
            await load();
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not remove member');
          }
        },
      },
    ]);
  }

  function confirmDeleteGroup() {
    if (!group) return;
    Alert.alert('Delete this group?', `“${group.name}” and its expenses will be removed on this device.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGroup(group._id);
            await reloadGroups();
            router.replace('/');
          } catch {
            setError('Could not delete group');
          }
        },
      },
    ]);
  }

  if (!group) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </View>
        {error ? <Text style={{ color: colors.danger, padding: 20 }}>{error}</Text> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.iconBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

          <Text style={[styles.section, { color: colors.textSecondary }]}>Group details</Text>
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => setIconsOpen(true)}
                style={[styles.iconPick, { borderColor: colors.border, backgroundColor: colors.softSurface }]}>
                <Text style={{ fontSize: 22 }}>{getGroupEmoji(icon)}</Text>
              </Pressable>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Group name"
                placeholderTextColor={colors.textSecondary}
                style={[
                  styles.input,
                  { flex: 1, color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                ]}
              />
            </View>
            <PrimaryButton
              title={savingDetails ? 'Saving…' : 'Save details'}
              loading={savingDetails}
              disabled={!name.trim()}
              onPress={saveDetails}
            />
          </View>

          <Text style={[styles.section, { color: colors.textSecondary }]}>Preferences</Text>
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Pressable onPress={() => setCurrencyOpen(true)} className="flex-row items-center" style={styles.prefRow}>
              <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>Currency</Text>
              <Text style={{ color: colors.textSecondary, marginRight: 4 }}>{selectedCurrency.label}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
            <Pressable onPress={openSplit} className="flex-row items-center" style={styles.prefRow}>
              <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>Default split</Text>
              <Text style={{ color: colors.textSecondary, marginRight: 4 }}>{methodLabel}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <Text style={[styles.section, { color: colors.textSecondary }]}>You in this group</Text>
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
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

          <Text style={[styles.section, { color: colors.textSecondary }]}>Manage members</Text>
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
                <Pressable onPress={() => confirmRemove(member)} hitSlop={8} style={styles.iconBtn}>
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

          <Pressable
            onPress={confirmDeleteGroup}
            style={[styles.deleteBtn, { borderColor: colors.danger }]}>
            <Text style={{ color: colors.danger, fontWeight: '700' }}>Delete group</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <EmojiPickerModal
        open={iconsOpen}
        onClose={() => setIconsOpen(false)}
        value={getGroupEmoji(icon)}
        onSelect={async (item) => {
          setIcon(item.emoji);
          if (!group) return;
          await updateGroup(group._id, {
            name: name.trim() || group.name,
            icon: item.emoji,
            currency,
          });
          await reloadGroups();
        }}
      />

      <Modal visible={currencyOpen} transparent animationType="fade" onRequestClose={() => setCurrencyOpen(false)}>
        <View style={styles.overlay}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: colors.overlay }]}
            onPress={() => setCurrencyOpen(false)}
          />
          <View style={[styles.sheet, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Currency</Text>
            {CURRENCIES.map((item) => {
              const active = item.code === currency;
              return (
                <Pressable
                  key={item.code}
                  onPress={async () => {
                    setCurrency(item.code);
                    setCurrencyOpen(false);
                    if (!group) return;
                    await updateGroup(group._id, {
                      name: name.trim() || group.name,
                      icon,
                      currency: item.code,
                    });
                    await reloadGroups();
                  }}
                  className="flex-row items-center"
                  style={[styles.option, active && { backgroundColor: colors.softSurface }]}>
                  <Text style={{ flex: 1, color: colors.text, fontWeight: active ? '700' : '500' }}>{item.label}</Text>
                  {active ? <MaterialIcons name="check" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>

      <Modal visible={splitOpen} transparent animationType="fade" onRequestClose={() => setSplitOpen(false)}>
        <View style={styles.overlay}>
          <Pressable
            style={[styles.backdrop, { backgroundColor: colors.overlay }]}
            onPress={() => setSplitOpen(false)}
          />
          <View style={[styles.sheet, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Default split</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 10 }}>
              Used for new expenses in this group.
            </Text>
            {SPLIT_METHODS.map((item) => {
              const active = draftMethod === item.value;
              return (
                <Pressable
                  key={item.value}
                  onPress={() => setDraftMethod(item.value)}
                  className="flex-row items-center"
                  style={[styles.option, active && { backgroundColor: colors.softSurface }]}>
                  <Text style={{ flex: 1, color: colors.text, fontWeight: active ? '700' : '500' }}>{item.label}</Text>
                  {active ? <MaterialIcons name="check" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
            {draftMethod === 'SHARES'
              ? members.map((member) => {
                  const parts = draftParts[member._id] ?? 1;
                  return (
                    <View key={member._id} className="flex-row items-center gap-2" style={styles.shareRow}>
                      <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                        {memberListLabel(member, user?._id, myMember?._id)}
                      </Text>
                      <View className="flex-row items-stretch overflow-hidden" style={[styles.stepper, { borderColor: colors.border }]}>
                        <Pressable
                          onPress={() =>
                            setDraftParts((prev) => ({ ...prev, [member._id]: Math.max(1, parts - 1) }))
                          }
                          className="w-8 items-center justify-center">
                          <Text style={{ color: colors.text, fontSize: 18 }}>−</Text>
                        </Pressable>
                        <Text style={{ minWidth: 28, textAlign: 'center', color: colors.text, fontWeight: '700' }}>
                          {parts}x
                        </Text>
                        <Pressable
                          onPress={() =>
                            setDraftParts((prev) => ({ ...prev, [member._id]: Math.min(99, parts + 1) }))
                          }
                          className="w-8 items-center justify-center">
                          <Text style={{ color: colors.text, fontSize: 18 }}>+</Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              : null}
            <View className="flex-row gap-2" style={{ marginTop: 12 }}>
              <Pressable
                onPress={() => setSplitOpen(false)}
                style={[styles.ghostBtn, { borderColor: colors.border, flex: 1 }]}>
                <Text style={{ color: colors.text, fontWeight: '600', textAlign: 'center' }}>Cancel</Text>
              </Pressable>
              <View style={{ flex: 1 }}>
                <PrimaryButton title={savingSplit ? 'Saving…' : 'Save'} loading={savingSplit} onPress={saveSplit} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
  },
  iconBtn: { padding: 6 },
  title: { flex: 1, fontSize: 22, fontWeight: '700' },
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
  iconPick: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  prefRow: { paddingVertical: 10, paddingHorizontal: 4 },
  memberRow: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  overlay: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  shareRow: { paddingVertical: 8 },
  stepper: {
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
  ghostBtn: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 13,
    justifyContent: 'center',
  },
});
