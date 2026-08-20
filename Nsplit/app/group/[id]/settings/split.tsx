import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SettingsHeader } from '@/components/settings/settings-header';
import { PrimaryButton } from '@/components/ui/primary-button';
import { useColors } from '@/hooks/use-colors';
import type { GroupDetail, GroupMember } from '@/src/api/types';
import { useAuth } from '@/src/auth/auth-context';
import { getGroup, updateGroupSettings } from '@/src/db/groups';
import { useIdentity } from '@/src/identity/identity-context';
import { SPLIT_METHODS, normalizeSplitMethod, type SplitMethodValue } from '@/src/lib/expense-form-utils';
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

export default function SplitMethodScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { name: myName, matchByName } = useIdentity();

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState('');
  const [method, setMethod] = useState<SplitMethodValue>('EQUAL');
  const [parts, setParts] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

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
    setMethod(normalizeSplitMethod(local.settings?.defaultSplitMethod));
    setParts(defaultPartsMap(local.members || [], local.settings?.defaultSplitConfig));
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

  async function save() {
    if (!group) return;
    setSaving(true);
    try {
      await updateGroupSettings(group._id, {
        defaultSplitMethod: method,
        defaultSplitConfig:
          method === 'SHARES'
            ? members.map((m) => ({ memberId: m._id, value: parts[m._id] || 1 }))
            : null,
      });
      router.back();
    } catch {
      setError('Could not save split method');
    } finally {
      setSaving(false);
    }
  }

  if (!group) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
        <SettingsHeader title="Default split" />
        {error ? <Text style={{ color: colors.danger, padding: 20 }}>{error}</Text> : null}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <SettingsHeader title="Default split" />
      <ScrollView contentContainerStyle={styles.body}>
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

        <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
          Used for new expenses in this group. You can still change the split on each expense.
        </Text>

        <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          {SPLIT_METHODS.map((item, index) => {
            const active = method === item.value;
            return (
              <View key={item.value}>
                {index > 0 ? (
                  <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border }} />
                ) : null}
                <Pressable
                  onPress={() => setMethod(item.value)}
                  className="flex-row items-center"
                  style={[styles.option, active && { backgroundColor: colors.softSurface }]}>
                  <Text style={{ flex: 1, color: colors.text, fontWeight: active ? '700' : '500' }}>{item.label}</Text>
                  {active ? <MaterialIcons name="check" size={18} color={colors.primary} /> : null}
                </Pressable>
              </View>
            );
          })}
        </View>

        {method === 'SHARES' ? (
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
              Parts decide how much each person owes. 2x pays twice as much as 1x.
            </Text>
            {members.map((member) => {
              const value = parts[member._id] ?? 1;
              return (
                <View key={member._id} className="flex-row items-center gap-2" style={styles.shareRow}>
                  <Text style={{ flex: 1, color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                    {memberListLabel(member, user?._id, myMember?._id)}
                  </Text>
                  <View
                    className="flex-row items-stretch overflow-hidden"
                    style={[styles.stepper, { borderColor: colors.border }]}>
                    <Pressable
                      onPress={() =>
                        setParts((prev) => ({ ...prev, [member._id]: Math.max(1, value - 1) }))
                      }
                      className="w-8 items-center justify-center">
                      <Text style={{ color: colors.text, fontSize: 18 }}>−</Text>
                    </Pressable>
                    <Text style={{ minWidth: 28, textAlign: 'center', color: colors.text, fontWeight: '700' }}>
                      {value}x
                    </Text>
                    <Pressable
                      onPress={() =>
                        setParts((prev) => ({ ...prev, [member._id]: Math.min(99, value + 1) }))
                      }
                      className="w-8 items-center justify-center">
                      <Text style={{ color: colors.text, fontSize: 18 }}>+</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        <PrimaryButton title={saving ? 'Saving…' : 'Save'} loading={saving} onPress={save} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 40, gap: 14 },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 8,
    overflow: 'hidden',
  },
  option: {
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  shareRow: { paddingVertical: 8, paddingHorizontal: 6 },
  stepper: {
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center',
  },
});
