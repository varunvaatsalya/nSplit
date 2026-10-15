import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatSignedMinor } from '@/components/balance/member-ledger-sheet';
import { SettingsHeader } from '@/components/settings/settings-header';
import { UserAvatar } from '@/components/user-avatar';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useColors } from '@/hooks/use-colors';
import type { Expense, GroupDetail, Transfer } from '@/src/api/types';
import { groupBalance, listExpenses } from '@/src/db/expenses';
import { getGroup } from '@/src/db/groups';
import { listTransfers } from '@/src/db/transfers';
import { formatLongDate, formatMinor, memberName } from '@/src/lib/format';
import {
  expenseDate,
  filterByRange,
  printGroupLedgerPdf,
  shareGroupLedgerPdf,
  transferDate,
} from '@/src/lib/group-ledger-pdf';
import { getExpenseEmoji } from '@/src/lib/icons';

type Preset = 'all' | 'month' | 'last-month' | '3m' | 'custom';

const PRESETS: { key: Preset; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: 'month', label: 'This month' },
  { key: 'last-month', label: 'Last month' },
  { key: '3m', label: 'Last 3 months' },
  { key: 'custom', label: 'Custom' },
];

const PAGE = 15;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function presetRange(preset: Preset): { from: Date | null; to: Date | null } {
  const now = new Date();
  if (preset === 'month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
  if (preset === 'last-month') {
    return {
      from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
      to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (preset === '3m') return { from: new Date(now.getFullYear(), now.getMonth() - 2, 1), to: endOfDay(now) };
  return { from: null, to: null };
}

export default function ExportScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const colorScheme = useColorScheme() ?? 'light';
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [allTransfers, setAllTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState<Preset>('all');
  const [customFrom, setCustomFrom] = useState(() => startOfDay(new Date(Date.now() - 30 * 86400000)));
  const [customTo, setCustomTo] = useState(() => startOfDay(new Date()));
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);
  const [visible, setVisible] = useState(PAGE);
  const [busy, setBusy] = useState<'share' | 'export' | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = await getGroup(String(id));
      if (!local || cancelled) return;
      const [e, t] = await Promise.all([listExpenses(local._id), listTransfers(local._id)]);
      if (cancelled) return;
      setGroup(local);
      setAllExpenses(e);
      setAllTransfers(t);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const range = useMemo(
    () =>
      preset === 'custom'
        ? { from: startOfDay(customFrom), to: endOfDay(customTo) }
        : presetRange(preset),
    [preset, customFrom, customTo]
  );

  const { expenses, transfers } = useMemo(
    () => filterByRange(allExpenses, allTransfers, range.from, range.to),
    [allExpenses, allTransfers, range]
  );

  const balance = useMemo(
    () => (group ? groupBalance(group, expenses, transfers) : null),
    [group, expenses, transfers]
  );

  // Same order as the PDF: oldest first.
  const rows = useMemo(
    () =>
      [
        ...expenses.map((expense) => ({
          key: `e-${expense._id}`,
          date: expenseDate(expense) || new Date(0),
          emoji: getExpenseEmoji(expense.icon, expense.categoryKey),
          title: expense.title || 'Expense',
          amountMinor: expense.amountMinor,
          transfer: false,
        })),
        ...transfers.map((transfer) => ({
          key: `t-${transfer._id}`,
          date: transferDate(transfer) || new Date(0),
          emoji: transfer.icon || '💸',
          title: transfer.title || 'Transfer',
          amountMinor: transfer.amountMinor,
          transfer: true,
        })),
      ].sort((a, b) => a.date.getTime() - b.date.getTime()),
    [expenses, transfers]
  );

  const currency = group?.currency || 'INR';
  const totalSpend = expenses.reduce((sum, e) => sum + (e.amountMinor || 0), 0);
  const scoped = preset !== 'all';
  const periodLabel =
    range.from && range.to
      ? `${formatLongDate(range.from)} – ${formatLongDate(range.to)}`
      : rows.length
        ? `${formatLongDate(rows[0].date)} – ${formatLongDate(rows[rows.length - 1].date)}`
        : '—';
  const memberById = Object.fromEntries((group?.members || []).map((m) => [m._id, m]));
  const balanceRows = (balance?.members || []).filter(
    (m) => m.netMinor || m.paidMinor || m.owedMinor
  );

  /** Set one end of the custom range, pushing the other end so from ≤ to always holds. */
  function applyDate(which: 'from' | 'to', event: DateTimePickerEvent, selected?: Date) {
    if (event.type === 'dismissed' || !selected) return;
    setVisible(PAGE);
    const day = startOfDay(selected);
    if (which === 'from') {
      setCustomFrom(day);
      if (day > customTo) setCustomTo(day);
    } else {
      setCustomTo(day);
      if (day < customFrom) setCustomFrom(day);
    }
  }

  function onAndroidPick(event: DateTimePickerEvent, selected?: Date) {
    const which = picking;
    setPicking(null);
    if (which) applyDate(which, event, selected);
  }

  async function run(kind: 'share' | 'export') {
    if (!group || busy) return;
    setBusy(kind);
    const input = { group, expenses, transfers, balance, range: scoped ? range : undefined };
    try {
      if (kind === 'share') await shareGroupLedgerPdf(input);
      else await printGroupLedgerPdf(input);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      Alert.alert(
        kind === 'share' ? 'Could not share' : 'Could not export',
        reason || 'Try again in a moment.'
      );
    } finally {
      setBusy(null);
    }
  }

  function toneFor(minor: number) {
    if (minor > 0) return colors.success;
    if (minor < 0) return colors.danger;
    return colors.textSecondary;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <SettingsHeader title="Export details" />

      {loading || !group ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={[styles.section, { color: colors.textSecondary }]}>DATE RANGE</Text>
            <View style={styles.chips}>
              {PRESETS.map((p) => {
                const active = p.key === preset;
                return (
                  <Pressable
                    key={p.key}
                    onPress={() => {
                      setPreset(p.key);
                      setVisible(PAGE);
                    }}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? colors.primary : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}>
                    <Text
                      style={{
                        color: active ? colors.primaryForeground : colors.text,
                        fontWeight: '600',
                        fontSize: 13,
                      }}>
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {preset === 'custom' ? (
              <View style={styles.dateRow}>
                {(['from', 'to'] as const).map((which) => {
                  const value = which === 'from' ? customFrom : customTo;
                  return (
                    <View
                      key={which}
                      style={[styles.dateField, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                        {which === 'from' ? 'From' : 'To'}
                      </Text>
                      {Platform.OS === 'ios' ? (
                        <DateTimePicker
                          value={value}
                          mode="date"
                          display="compact"
                          maximumDate={new Date()}
                          themeVariant={colorScheme === 'dark' ? 'dark' : 'light'}
                          onChange={(event, selected) => applyDate(which, event, selected)}
                          style={{ alignSelf: 'flex-start', marginTop: 4, marginLeft: -8 }}
                        />
                      ) : (
                        <Pressable onPress={() => setPicking(which)} hitSlop={6}>
                          <Text style={{ color: colors.text, fontWeight: '700', marginTop: 4 }}>
                            {formatLongDate(value)}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : null}

            {Platform.OS === 'android' && picking ? (
              <DateTimePicker
                value={picking === 'from' ? customFrom : customTo}
                mode="date"
                maximumDate={new Date()}
                onChange={onAndroidPick}
              />
            ) : null}

            <View style={[styles.summary, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <SummaryItem label="Period" value={periodLabel} wide />
              <SummaryItem label="Records" value={String(rows.length)} />
              <SummaryItem label="Total spend" value={formatMinor(totalSpend, currency)} />
            </View>

            <Text style={[styles.section, { color: colors.textSecondary }]}>
              PREVIEW · LEDGER ({rows.length})
            </Text>
            {rows.length ? (
              <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                {rows.slice(0, visible).map((row, i) => (
                  <View
                    key={row.key}
                    style={[
                      styles.ledgerRow,
                      i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                    ]}>
                    <Text style={{ fontSize: 18 }}>{row.emoji}</Text>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                        {row.title}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }}>
                        {formatLongDate(row.date)}
                        {row.transfer ? ' · Payment' : ''}
                      </Text>
                    </View>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>
                      {formatMinor(row.amountMinor, currency)}
                    </Text>
                  </View>
                ))}
                {rows.length > PAGE ? (
                  <Pressable
                    onPress={() =>
                      setVisible((v) => (v >= rows.length ? PAGE : Math.min(v + 20, rows.length)))
                    }
                    style={[styles.more, { borderTopColor: colors.border }]}>
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>
                      {visible >= rows.length ? 'Show less' : `View more (${rows.length - visible} left)`}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ) : (
              <View style={[styles.card, styles.empty, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={{ color: colors.textSecondary }}>No expenses or payments in this period.</Text>
              </View>
            )}

            {balanceRows.length ? (
              <>
                <Text style={[styles.section, { color: colors.textSecondary }]}>
                  MEMBER BALANCES{scoped ? ' · THIS PERIOD' : ''}
                </Text>
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  {balanceRows.map((m, i) => {
                    const member = memberById[m._id];
                    return (
                      <View
                        key={m._id}
                        style={[
                          styles.ledgerRow,
                          i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                        ]}>
                        <UserAvatar
                          name={memberName(member || m)}
                          avatar={member?.avatar || member?.user?.avatar}
                          seed={member?.userId || m._id}
                          size={28}
                        />
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                            {memberName(member || m)}
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 1 }} numberOfLines={1}>
                            Paid {formatMinor(m.paidMinor || 0, currency)} · Share{' '}
                            {formatMinor(m.owedMinor || 0, currency)}
                          </Text>
                        </View>
                        <Text style={{ color: toneFor(m.netMinor), fontWeight: '700' }}>
                          {formatSignedMinor(m.netMinor, currency)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}

            <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 12, textAlign: 'center' }}>
              The PDF also includes group details and suggested settlements.
            </Text>
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <Pressable
              disabled={Boolean(busy) || !rows.length}
              onPress={() => run('export')}
              style={[
                styles.btn,
                { borderWidth: 1, borderColor: colors.border, opacity: !rows.length ? 0.5 : 1 },
              ]}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {busy === 'export' ? 'Preparing…' : 'Export PDF'}
              </Text>
            </Pressable>
            <Pressable
              disabled={Boolean(busy) || !rows.length}
              onPress={() => run('share')}
              style={[styles.btn, { backgroundColor: colors.primary, opacity: !rows.length ? 0.5 : 1 }]}>
              <Text style={{ color: colors.primaryForeground, fontWeight: '700' }}>
                {busy === 'share' ? 'Preparing…' : 'Share PDF'}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function SummaryItem({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.summaryItem, wide && { width: '100%' }]}>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.text, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: 20, paddingBottom: 24 },
  section: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginTop: 18, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  dateRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  dateField: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 12 },
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 6,
    marginTop: 16,
  },
  summaryItem: { width: '50%', paddingHorizontal: 14, paddingVertical: 8 },
  card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12 },
  empty: { paddingVertical: 20, alignItems: 'center' },
  ledgerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  more: { borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 12, alignItems: 'center' },
  footer: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: { flex: 1, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
