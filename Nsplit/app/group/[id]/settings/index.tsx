import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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

import { EmojiPickerModal } from '@/components/expenses/emoji-picker-modal';
import { SettingsHeader } from '@/components/settings/settings-header';
import { PrimaryButton } from '@/components/ui/primary-button';
import { UserAvatar } from '@/components/user-avatar';
import { useColors } from '@/hooks/use-colors';
import type { GroupDetail } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import { getGroup, updateGroup } from '@/src/db/groups';
import { useGroups } from '@/src/groups/groups-context';
import { useIdentity } from '@/src/identity/identity-context';
import { SPLIT_METHODS, normalizeSplitMethod } from '@/src/lib/expense-form-utils';
import { CURRENCIES, getGroupEmoji } from '@/src/lib/icons';
import { memberListLabel, resolveMyMember, sortMembersByName } from '@/src/lib/members';

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
  const methodLabel =
    SPLIT_METHODS.find((item) => item.value === normalizeSplitMethod(group?.settings?.defaultSplitMethod))
      ?.label || 'Equally';

  function settingsPath(screen: 'members' | 'split' | 'delete') {
    return {
      pathname: `/group/[id]/settings/${screen}`,
      params: { id: String(id) },
    };
  }

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

  async function saveCurrency(code: string) {
    setCurrency(code);
    setCurrencyOpen(false);
    if (!group) return;
    await updateGroup(group._id, {
      name: name.trim() || group.name,
      icon,
      currency: code,
    });
    await reloadGroups();
  }

  if (!group) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <SettingsHeader title="Settings" />
        {error ? <Text style={{ color: colors.danger, padding: 20 }}>{error}</Text> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <SettingsHeader title="Settings" />

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
              <Text style={{ color: colors.textSecondary, marginRight: 6 }}>
                {selectedCurrency.flag} {selectedCurrency.code}
              </Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
            <Pressable
              onPress={() => router.push(settingsPath('split'))}
              className="flex-row items-center"
              style={styles.prefRow}>
              <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }}>Default split</Text>
              <Text style={{ color: colors.textSecondary, marginRight: 6 }}>{methodLabel}</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.sectionRow}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text }}>Members</Text>
            <Pressable onPress={() => router.push(settingsPath('members'))} hitSlop={8}>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 14 }}>Manage</Text>
            </Pressable>
          </View>
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
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => router.push(settingsPath('delete'))}
            style={[styles.deleteBtn, { borderColor: colors.danger }]}>
            <Text style={{ color: colors.danger, fontWeight: '700' }}>Delete group</Text>
            <MaterialIcons name="chevron-right" size={20} color={colors.danger} />
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
                  onPress={() => saveCurrency(item.code)}
                  className="flex-row items-center"
                  style={[styles.option, active && { backgroundColor: colors.softSurface }]}>
                  <Text style={{ fontSize: 22, marginRight: 10 }}>{item.flag}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontWeight: active ? '700' : '600' }}>{item.label}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.code}</Text>
                  </View>
                  {active ? <MaterialIcons name="check" size={18} color={colors.primary} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>
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
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  deleteBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
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
});
