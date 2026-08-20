import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { UserAvatar } from '@/components/user-avatar';
import { useColors } from '@/hooks/use-colors';
import type {
  GroupBalance,
  GroupDetail,
  GroupMember,
  Pairwise,
} from '@/src/api/types';
import { saveTransfer } from '@/src/db/transfers';
import { formatMinor, memberName } from '@/src/lib/format';
import { isSelfMember, memberListLabel } from '@/src/lib/members';

export function BalanceView({
  group,
  balance,
  currentUserId,
  myMemberId,
  onPaid,
  onExport,
}: {
  group: GroupDetail;
  balance: GroupBalance | null;
  currentUserId?: string | null;
  myMemberId?: string | null;
  onPaid: () => Promise<void> | void;
  onExport: () => void;
}) {
  const colors = useColors();
  const members = group.members || [];
  const currency = group.currency || 'INR';
  const [pending, setPending] = useState<Pairwise | null>(null);
  const [saving, setSaving] = useState(false);

  const memberById = useMemo(
    () => Object.fromEntries(members.map((m) => [m._id, m])),
    [members]
  );

  const { owe, getBack, settled } = useMemo(() => {
    const list = [...(balance?.members || [])];
    const oweRows = list.filter((m) => (m.netMinor || 0) < 0).sort((a, b) => a.netMinor - b.netMinor);
    const getRows = list.filter((m) => (m.netMinor || 0) > 0).sort((a, b) => b.netMinor - a.netMinor);
    const settledRows = list.filter((m) => (m.netMinor || 0) === 0);
    return { owe: oweRows, getBack: getRows, settled: settledRows };
  }, [balance?.members]);

  const pairwise = balance?.pairwise || [];
  const unsettled = pairwise.reduce((sum, row) => sum + (row.amountMinor || 0), 0);

  async function confirmPaid() {
    if (!pending || saving) return;
    setSaving(true);
    try {
      const fromName = pending.fromName || memberName(memberById[pending.from]);
      const toName = pending.toName || memberName(memberById[pending.to]);
      await saveTransfer(group._id, {
        title: `${fromName} paid ${toName}`,
        icon: '💸',
        amountMinor: pending.amountMinor,
        fromMemberId: pending.from,
        toMemberId: pending.to,
        createdById: currentUserId,
      });
      setPending(null);
      await onPaid();
    } catch {
      Alert.alert('Could not mark as paid', 'Try again.');
    } finally {
      setSaving(false);
    }
  }

  function renderMember(m: (typeof owe)[number], kind: 'owe' | 'get' | 'settled') {
    const member = memberById[m._id];
    const net = m.netMinor || 0;
    const self = isSelfMember(member, currentUserId, myMemberId);
    const tone = kind === 'owe' ? colors.danger : kind === 'get' ? colors.success : colors.textSecondary;
    const amount =
      kind === 'owe' ? `−${formatMinor(-net, currency)}` : kind === 'get' ? `+${formatMinor(net, currency)}` : formatMinor(0, currency);
    const subtitle =
      kind === 'owe' ? 'Needs to pay' : kind === 'get' ? 'Gets back' : 'Settled up';

    return (
      <View
        key={m._id}
        style={[
          styles.row,
          {
            backgroundColor: colors.surface,
            borderColor: self ? colors.primary : colors.border,
          },
        ]}>
        <UserAvatar
          name={memberName(member || m)}
          avatar={member?.avatar || member?.user?.avatar}
          seed={member?.userId || m._id}
          size={40}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {memberListLabel(member || m, currentUserId, myMemberId)}
          </Text>
          <Text style={{ color: tone, fontSize: 12, fontWeight: '600', marginTop: 2 }}>{subtitle}</Text>
        </View>
        <Text style={[styles.amount, { color: tone }]}>{amount}</Text>
      </View>
    );
  }

  if (!balance?.members?.length) {
    return (
      <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 24 }}>
        No balances yet.
      </Text>
    );
  }

  const pendingFrom = pending ? memberById[pending.from] : null;
  const pendingTo = pending ? memberById[pending.to] : null;

  return (
    <View style={{ gap: 18 }}>
      <Pressable
        onPress={onExport}
        style={[styles.exportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.exportIcon, { backgroundColor: `${colors.primary}1A` }]}>
          <MaterialIcons name="picture-as-pdf" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: colors.text }]}>Export details</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
            PDF ledger · share or save
          </Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={colors.textSecondary} />
      </Pressable>

      {owe.length ? (
        <View>
          <Text style={[styles.section, { color: colors.danger }]}>Owes</Text>
          <View style={{ gap: 8 }}>{owe.map((m) => renderMember(m, 'owe'))}</View>
        </View>
      ) : null}

      {getBack.length ? (
        <View>
          <Text style={[styles.section, { color: colors.success }]}>Gets back</Text>
          <View style={{ gap: 8 }}>{getBack.map((m) => renderMember(m, 'get'))}</View>
        </View>
      ) : null}

      {settled.length ? (
        <View>
          <Text style={[styles.section, { color: colors.textSecondary }]}>Settled</Text>
          <View style={{ gap: 8 }}>{settled.map((m) => renderMember(m, 'settled'))}</View>
        </View>
      ) : null}

      <View>
        <Text style={[styles.section, { color: colors.text }]}>Suggested payments</Text>
        {pairwise.length ? (
          <View style={{ gap: 10 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 2 }}>
              {formatMinor(unsettled, currency)} still to settle
            </Text>
            {pairwise.map((p, i) => {
              const from = memberById[p.from];
              const to = memberById[p.to];
              return (
                <View
                  key={`${p.from}-${p.to}-${i}`}
                  style={[styles.settleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={styles.settlePeople}>
                    <MemberChip member={from} currentUserId={currentUserId} myMemberId={myMemberId} />
                    <View style={[styles.arrow, { backgroundColor: colors.softSurface }]}>
                      <MaterialIcons name="arrow-forward" size={16} color={colors.textSecondary} />
                    </View>
                    <MemberChip member={to} currentUserId={currentUserId} myMemberId={myMemberId} />
                  </View>
                  <Text style={[styles.settleCopy, { color: colors.text }]}>
                    {memberListLabel(from, currentUserId, myMemberId)} should pay{' '}
                    {memberListLabel(to, currentUserId, myMemberId)}
                  </Text>
                  <Text style={[styles.settleAmount, { color: colors.text }]}>
                    {formatMinor(p.amountMinor, currency)}
                  </Text>
                  <Pressable
                    onPress={() => setPending(p)}
                    style={[styles.paidBtn, { backgroundColor: colors.primary }]}>
                    <Text style={[styles.paidBtnText, { color: colors.primaryForeground }]}>
                      Mark as paid
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={[styles.settleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ color: colors.success, fontWeight: '700' }}>Everyone is settled up</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4, fontSize: 13 }}>
              No payments left in this group.
            </Text>
          </View>
        )}
      </View>

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open && !saving) setPending(null);
        }}
        title="Mark as paid?"
        description={
          pending
            ? `This will record a transfer of ${formatMinor(pending.amountMinor, currency)} from ${memberListLabel(pendingFrom || undefined, currentUserId, myMemberId)} to ${memberListLabel(pendingTo || undefined, currentUserId, myMemberId)}.`
            : undefined
        }
        confirmLabel="Mark paid"
        cancelLabel="Cancel"
        tone="default"
        loading={saving}
        onConfirm={confirmPaid}
      />
    </View>
  );
}

function MemberChip({
  member,
  currentUserId,
  myMemberId,
}: {
  member?: GroupMember;
  currentUserId?: string | null;
  myMemberId?: string | null;
}) {
  const colors = useColors();
  return (
    <View style={styles.chip}>
      <UserAvatar
        name={memberName(member)}
        avatar={member?.avatar || member?.user?.avatar}
        seed={member?.userId || member?._id}
        size={36}
      />
      <Text style={{ color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 6 }} numberOfLines={1}>
        {memberListLabel(member, currentUserId, myMemberId)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  exportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  exportIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  name: { fontSize: 15, fontWeight: '700' },
  amount: { fontSize: 16, fontWeight: '800' },
  settleCard: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
  },
  settlePeople: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chip: { flex: 1, alignItems: 'center', minWidth: 0 },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  settleCopy: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  settleAmount: { fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 6, marginBottom: 12 },
  paidBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paidBtnText: { fontSize: 15, fontWeight: '700' },
});
