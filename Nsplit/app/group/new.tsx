import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
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
import { Field, InlineField } from '@/components/ui/field';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useColors } from '@/hooks/use-colors';
import { useAuth } from '@/src/auth/auth-context';
import { useGroups } from '@/src/groups/groups-context';
import { useIdentity } from '@/src/identity/identity-context';
import {
  CURRENCIES,
  DEFAULT_GROUP_EMOJI,
  getGroupEmoji,
  suggestGroupEmojiFromName,
} from '@/src/lib/icons';

function emptyMember() {
  return { name: '' };
}

export default function NewGroupScreen() {
  const colors = useColors();
  const router = useRouter();
  const { user } = useAuth();
  const { name: myName, matchByName } = useIdentity();
  const { createGroup } = useGroups();
  const nameRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(DEFAULT_GROUP_EMOJI);
  const [iconManual, setIconManual] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [currency, setCurrency] = useState('INR');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [members, setMembers] = useState([{ name: '' }]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const selectedCurrency = CURRENCIES.find((c) => c.code === currency) || CURRENCIES[0];
  const canAddMember = Boolean(members[members.length - 1]?.name.trim());

  useEffect(() => {
    const timer = setTimeout(() => nameRef.current?.focus(), 450);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!myName) return;
    setMembers((prev) => {
      if (prev.length === 1 && !prev[0].name.trim()) return [{ name: myName }];
      return prev;
    });
  }, [myName]);

  function addMember() {
    if (!canAddMember) return;
    setMembers((prev) => [...prev, emptyMember()]);
  }

  async function onCreate() {
    setError('');
    if (!name.trim()) {
      setError('Give the group a name');
      return;
    }
    const cleaned = members.map((m) => ({ name: m.name.trim() })).filter((m) => m.name);
    if (!user && cleaned.length === 0) {
      setError('Add at least one member');
      return;
    }
    setCreating(true);
    try {
      await createGroup({
        name: name.trim(),
        icon,
        currency,
        members: cleaned,
        creator: user,
        myName: myName || user?.name,
        matchByName,
      });
      router.back();
    } catch {
      setError('Could not create group');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>New group</Text>
        </View>

        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Pick an icon, add members, and start splitting.
          </Text>

          <View style={styles.nameRow}>
            <Pressable
              onPress={() => setIconsOpen(true)}
              style={[
                styles.emojiBtn,
                { borderColor: colors.border, backgroundColor: colors.softSurface },
              ]}>
              <Text style={{ fontSize: 18 }}>{getGroupEmoji(icon)}</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Field
                ref={nameRef}
                autoFocus
                placeholder="Trip to Goa"
                value={name}
                onChangeText={(next) => {
                  setName(next);
                  if (!iconManual) setIcon(suggestGroupEmojiFromName(next));
                }}
              />
            </View>
          </View>

          <Pressable
            onPress={() => setCurrencyOpen(true)}
            style={[
              styles.select,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}>
            <Text style={{ color: colors.text, fontSize: 16 }}>{selectedCurrency.label}</Text>
            <MaterialIcons name="expand-more" size={22} color={colors.textSecondary} />
          </Pressable>

          <View style={[styles.membersSection, { borderTopColor: colors.border }]}>
            <Text style={[styles.membersLabel, { color: colors.text }]}>Members</Text>

            {members.map((member, index) => (
              <InlineField
                key={index}
                placeholder="Name / nickname"
                value={member.name}
                onChangeText={(next) =>
                  setMembers((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, name: next } : row))
                  )
                }
                left={
                  <Text style={[styles.countText, { color: colors.textSecondary }]}>{index + 1}</Text>
                }
                right={
                  members.length > 1 ? (
                    <Pressable
                      onPress={() => setMembers((prev) => prev.filter((_, i) => i !== index))}
                      hitSlop={8}
                      style={styles.removeBtn}>
                      <MaterialIcons name="close" size={18} color={colors.textSecondary} />
                    </Pressable>
                  ) : null
                }
              />
            ))}

            <Pressable
              onPress={addMember}
              disabled={!canAddMember}
              style={[styles.addMember, { opacity: canAddMember ? 1 : 0.4 }]}>
              <MaterialIcons name="add" size={18} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 14 }}>
                Add member
              </Text>
            </Pressable>
          </View>

          {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

          <View style={styles.actions}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.cancel, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Cancel</Text>
            </Pressable>
            <View style={{ flex: 1 }}>
              <PrimaryButton
                title={creating ? 'Creating…' : 'Create group'}
                loading={creating}
                disabled={!name.trim()}
                onPress={onCreate}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={currencyOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrencyOpen(false)}>
        <View style={styles.dropdownOverlay}>
          <Pressable style={[styles.dropdownBackdrop, { backgroundColor: colors.overlay }]} onPress={() => setCurrencyOpen(false)} />
          <View style={[styles.dropdownSheet, { backgroundColor: colors.elevated, borderColor: colors.border }]}>
            <Text style={[styles.dropdownTitle, { color: colors.text }]}>Currency</Text>
            {CURRENCIES.map((item) => {
              const active = item.code === currency;
              return (
                <Pressable
                  key={item.code}
                  onPress={() => {
                    setCurrency(item.code);
                    setCurrencyOpen(false);
                  }}
                  style={[
                    styles.dropdownOption,
                    active && { backgroundColor: colors.softSurface },
                  ]}>
                  <Text style={{ color: colors.text, fontWeight: active ? '700' : '500' }}>
                    {item.label}
                  </Text>
                  {active ? (
                    <MaterialIcons name="check" size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Modal>

      <EmojiPickerModal
        open={iconsOpen}
        onClose={() => setIconsOpen(false)}
        value={getGroupEmoji(icon)}
        onSelect={(item) => {
          setIcon(item.emoji);
          setIconManual(true);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 10,
  },
  backBtn: { padding: 6 },
  title: { flex: 1, fontSize: 22, fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  description: { fontSize: 14, marginBottom: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  select: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  membersSection: {
    borderTopWidth: 1,
    paddingTop: 14,
    gap: 10,
  },
  membersLabel: { fontSize: 14, fontWeight: '600' },
  countText: { fontSize: 13, fontWeight: '700', minWidth: 16, textAlign: 'center' },
  removeBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMember: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  cancel: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  dropdownBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dropdownSheet: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    overflow: 'hidden',
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  dropdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dropdownOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
