import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { UserAvatar } from '@/components/user-avatar';
import { useColors } from '@/hooks/use-colors';
import type { GroupMember } from '@/src/api/types';
import { dateHeaderLabel, formatMinor, memberName } from '@/src/lib/format';
import { getExpenseEmoji } from '@/src/lib/icons';
import { memberTotals, type Ledger } from '@/src/lib/ledger';
import { memberListLabel } from '@/src/lib/members';

export function formatSignedMinor(minor: number, currency: string) {
  if (minor > 0) return `+${formatMinor(minor, currency)}`;
  if (minor < 0) return `−${formatMinor(-minor, currency)}`;
  return formatMinor(0, currency);
}

/** Full-screen balance sheet for one member: totals plus every record that moved their balance. */
export function MemberLedgerSheet({
  member,
  ledger,
  currency,
  currentUserId,
  myMemberId,
  onClose,
}: {
  member: GroupMember | null;
  ledger: Ledger;
  currency: string;
  currentUserId?: string | null;
  myMemberId?: string | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const memberId = member?._id;

  const rows = useMemo(
    () =>
      memberId
        ? ledger.entries.filter((e) => e.lines[memberId]).reverse()
        : [],
    [ledger, memberId]
  );
  const totals = useMemo(
    () => (memberId ? memberTotals(ledger, memberId) : null),
    [ledger, memberId]
  );
  const net = rows[0] && memberId ? rows[0].lines[memberId].afterMinor : 0;

  function toneFor(minor: number) {
    if (minor > 0) return colors.success;
    if (minor < 0) return colors.danger;
    return colors.textSecondary;
  }

  const label = member ? memberListLabel(member, currentUserId, myMemberId) : '';

  return (
    <Modal
      visible={Boolean(member)}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.top}>
          <Pressable onPress={onClose} hitSlop={8}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.topTitle, { color: colors.text }]}>Balance sheet</Text>
          <View style={{ width: 24 }} />
        </View>

        {member && totals ? (
          <ScrollView contentContainerStyle={styles.body}>
            <View style={styles.head}>
              <UserAvatar
                name={memberName(member)}
                avatar={member.avatar || member.user?.avatar}
                seed={member.userId || member._id}
                size={56}
              />
              <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                {label}
              </Text>
              <Text style={[styles.net, { color: toneFor(net) }]}>{formatSignedMinor(net, currency)}</Text>
              <Text style={{ color: toneFor(net), fontSize: 13, fontWeight: '600' }}>
                {net > 0 ? 'Gets back' : net < 0 ? 'Needs to pay' : 'Settled up'}
              </Text>
            </View>

            <View style={[styles.grid, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Stat label="Paid for expenses" value={formatMinor(totals.paidMinor, currency)} />
              <Stat label="Their share" value={formatMinor(totals.shareMinor, currency)} />
              <Stat label="Payments sent" value={formatMinor(totals.sentMinor, currency)} />
              <Stat label="Payments received" value={formatMinor(totals.receivedMinor, currency)} />
            </View>
            <Text style={[styles.formula, { color: colors.textSecondary }]}>
              Balance = paid − share + sent − received
            </Text>

            <Text style={[styles.section, { color: colors.textSecondary }]}>
              HISTORY ({rows.length})
            </Text>
            {rows.length ? (
              <View style={{ gap: 8 }}>
                {rows.map((entry) => {
                  const line = entry.lines[member._id];
                  const isTransfer = entry.kind === 'transfer';
                  const detail = isTransfer
                    ? line.paidMinor
                      ? `Sent ${formatMinor(line.paidMinor, currency)}`
                      : `Received ${formatMinor(line.shareMinor, currency)}`
                    : [
                        line.paidMinor ? `Paid ${formatMinor(line.paidMinor, currency)}` : null,
                        line.shareMinor ? `Share ${formatMinor(line.shareMinor, currency)}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ');
                  return (
                    <View
                      key={`${entry.kind}-${entry.id}`}
                      style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <View style={[styles.emoji, { backgroundColor: colors.softSurface }]}>
                        <Text style={{ fontSize: 18 }}>
                          {isTransfer ? entry.icon || '💸' : getExpenseEmoji(entry.icon, entry.categoryKey)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>
                          {entry.title}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                          {dateHeaderLabel(entry.date)}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>
                          {detail}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: toneFor(line.deltaMinor), fontWeight: '800' }}>
                          {formatSignedMinor(line.deltaMinor, currency)}
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>
                          Balance
                        </Text>
                        <Text style={{ color: toneFor(line.afterMinor), fontSize: 12, fontWeight: '700' }}>
                          {formatSignedMinor(line.afterMinor, currency)}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ) : (
              <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 12 }}>
                No expenses or payments yet.
              </Text>
            )}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  return (
    <View style={styles.stat}>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontSize: 15, fontWeight: '700', marginTop: 2 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topTitle: { fontSize: 16, fontWeight: '700' },
  body: { paddingHorizontal: 20, paddingBottom: 40 },
  head: { alignItems: 'center', marginTop: 4, marginBottom: 18 },
  name: { fontSize: 18, fontWeight: '700', marginTop: 10 },
  net: { fontSize: 28, fontWeight: '800', marginTop: 6 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
  },
  stat: { width: '50%', paddingHorizontal: 14, paddingVertical: 8 },
  formula: { fontSize: 11, textAlign: 'center', marginTop: 8 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 20, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  emoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
