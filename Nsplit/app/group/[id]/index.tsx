import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import AddNotes from "@/assets/illustrations/add-notes-amico.svg";
import BalanceAmico from "@/assets/illustrations/balence-amico.svg";
import { RecordDetailModal } from "@/components/records/record-detail-modal";
import { UserAvatar } from "@/components/user-avatar";
import { useColors } from "@/hooks/use-colors";
import type {
  Expense,
  GroupBalance,
  GroupDetail,
  GroupMember,
  Transfer,
} from "@/src/api/types";
import { useAuth } from "@/src/auth/auth-context";
import { groupBalance, listExpenses } from "@/src/db/expenses";
import { getGroup } from "@/src/db/groups";
import { listTransfers } from "@/src/db/transfers";
import { useIdentity } from "@/src/identity/identity-context";
import {
  dateHeaderLabel,
  formatMinor,
  formatRowTime,
  memberName,
} from "@/src/lib/format";
import { getExpenseEmoji, getGroupEmoji } from "@/src/lib/icons";
import { isSelfMember, resolveMyMember } from "@/src/lib/members";

type FeedItem =
  | { kind: "expense"; id: string; date: Date; expense: Expense }
  | { kind: "transfer"; id: string; date: Date; transfer: Transfer };

function feedDayKey(date: Date) {
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupFeedItems(expenses: Expense[], transfers: Transfer[]) {
  const items: FeedItem[] = [
    ...expenses.map((expense) => ({
      kind: "expense" as const,
      id: expense._id,
      date: new Date(expense.expenseDate || expense.createdAt || ""),
      expense,
    })),
    ...transfers.map((transfer) => ({
      kind: "transfer" as const,
      id: transfer._id,
      date: new Date(transfer.transferDate || transfer.createdAt || ""),
      transfer,
    })),
  ];
  const map = new Map<string, { key: string; date: Date; items: FeedItem[] }>();
  for (const item of items) {
    const key = feedDayKey(item.date);
    if (!map.has(key)) map.set(key, { key, date: item.date, items: [] });
    map.get(key)!.items.push(item);
  }
  for (const section of map.values()) {
    section.items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }
  return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}

function payerMembers(expense: Expense, members: GroupMember[]) {
  return (expense.payers || [])
    .map((p) => members.find((m) => m._id === p.memberId))
    .filter(Boolean) as GroupMember[];
}

function MemberInline({
  member,
  currentUserId,
  myMemberId,
}: {
  member?: GroupMember | null;
  currentUserId?: string | null;
  myMemberId?: string | null;
  // colors: ReturnType<typeof useColors>;
}) {
  const self = isSelfMember(member, currentUserId, myMemberId);
  return (
    <>
      <Text
        style={{
          fontWeight: "700",
          fontSize: 12,
        }}
      >
        {memberName(member)}
      </Text>
      {self ? (
        <Text style={{ fontSize: 11, fontWeight: "700" }}> (me)</Text>
      ) : null}
    </>
  );
}

function FeedRow({
  icon,
  title,
  amount,
  meta,
  onPress,
  colors,
}: {
  icon: string;
  title: string;
  amount: string;
  meta: ReactNode;
  onPress?: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const body = (
    <>
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <View style={styles.expenseIcon}>
          <Text style={{ fontSize: 24 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[styles.expenseTitle, { color: colors.text }]}
            numberOfLines={2}
          >
            {title}
          </Text>
          {meta}
        </View>
      </View>
      <Text
        style={[
          styles.amount,
          { color: colors.text, flexShrink: 0, paddingRight: 8 },
        ]}
      >
        {amount}
      </Text>
    </>
  );
  const rowStyle = [styles.expenseRow, { backgroundColor: colors.softSurface }];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        className="flex-row items-center gap-3"
        style={rowStyle}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View className="flex-row items-center" style={rowStyle}>
      {body}
    </View>
  );
}

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { name: myName, matchByName } = useIdentity();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [balance, setBalance] = useState<GroupBalance | null>(null);
  const [me, setMe] = useState(user);
  const [error, setError] = useState("");
  const [view, setView] = useState<"expenses" | "balance">("expenses");
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailIndex, setDetailIndex] = useState(0);
  const { width } = useWindowDimensions();
  const artWidth = Math.min(260, Math.round(width * 0.62));
  const artHeight = artWidth;

  const load = useCallback(async () => {
    if (!id) return;
    const local = await getGroup(String(id));
    if (!local) {
      setError("Group not found");
      setGroup(null);
      setReady(true);
      return;
    }
    setError("");
    setGroup(local);
    const localExpenses = await listExpenses(local._id);
    const localTransfers = await listTransfers(local._id);
    setExpenses(localExpenses);
    setTransfers(localTransfers);
    setBalance(groupBalance(local, localExpenses, localTransfers));
    setMe(user);
    setReady(true);
  }, [id, user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const members = group?.members || [];
  const grouped = useMemo(
    () => groupFeedItems(expenses, transfers),
    [expenses, transfers],
  );
  const feedEmpty = expenses.length === 0 && transfers.length === 0;
  const myMember = useMemo(
    () =>
      resolveMyMember(members, {
        userId: me?._id,
        myName,
        matchByName,
        myMemberId: group?.myMembershipId,
      }),
    [members, me, myName, matchByName, group?.myMembershipId],
  );
  const canAdd = true;
  const feedItems = useMemo(
    () => grouped.flatMap((section) => section.items),
    [grouped],
  );

  function openAdd() {
    router.push({ pathname: "/group/[id]/add", params: { id: String(id) } });
  }

  function openRecord(kind: FeedItem["kind"], recordId: string) {
    const idx = feedItems.findIndex(
      (item) => item.kind === kind && item.id === recordId,
    );
    if (idx < 0) return;
    setDetailIndex(idx);
    setDetailOpen(true);
  }

  if (error && !group) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backRow}>
          <Feather name="settings" size={22} color={colors.text} />
          <Text style={{ color: colors.text, marginLeft: 8 }}>Groups</Text>
        </Pressable>
        <Text style={{ color: colors.danger, padding: 20 }}>{error}</Text>
      </SafeAreaView>
    );
  }

  if (!ready || !group) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: colors.background }]}
      >
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background }]}
      edges={["top"]}
    >
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.iconBtn}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.text} />
        </Pressable>
        <View
          style={[styles.groupIcon, { backgroundColor: colors.softSurface }]}
        >
          <Text style={{ fontSize: 22 }}>{getGroupEmoji(group.icon)}</Text>
        </View>
        <Text
          style={[styles.groupTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {group.name}
        </Text>
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/group/[id]/settings",
              params: { id: String(id) },
            })
          }
          hitSlop={10}
          style={styles.iconBtn}
        >
          <Feather name="settings" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.toggleWrap}>
        <View style={[styles.toggle, { backgroundColor: colors.softSurface }]}>
          {(["expenses", "balance"] as const).map((key) => {
            const active = view === key;
            return (
              <Pressable
                key={key}
                onPress={() => setView(key)}
                style={[
                  styles.toggleBtn,
                  active && {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? colors.text : colors.textSecondary,
                    fontWeight: "600",
                    textTransform: "capitalize",
                  }}
                >
                  {key}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, feedEmpty && styles.bodyEmpty]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {feedEmpty ? (
          <View style={styles.empty}>
            {view === "balance" ? (
              <BalanceAmico width={artWidth} height={artHeight} />
            ) : (
              <AddNotes width={artWidth} height={artHeight} />
            )}
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {view === "balance" ? "No balances yet" : "Nothing here yet"}
            </Text>
            <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>
              {view === "balance"
                ? "Balances appear here after you\nadd an expense to this group."
                : "Add the first expense to start splitting with this group."}
            </Text>
            <Pressable onPress={openAdd} hitSlop={8}>
              <Text style={[styles.emptyAction, { color: colors.primary }]}>
                Add expense
              </Text>
            </Pressable>
          </View>
        ) : view === "balance" ? (
          <BalanceList balance={balance} currency={group.currency || "INR"} />
        ) : (
          grouped.map((section) => (
            <View key={section.key} style={{ marginBottom: 18 }}>
              <Text style={[styles.dateHead, { color: colors.text }]}>
                {dateHeaderLabel(section.date)}
              </Text>
              <View style={{ gap: 10 }}>
                {section.items.map((item) => {
                  if (item.kind === "transfer") {
                    const transfer = item.transfer;
                    const from = members.find(
                      (m) => m._id === transfer.fromMemberId,
                    );
                    const to = members.find(
                      (m) => m._id === transfer.toMemberId,
                    );
                    return (
                      <FeedRow
                        key={transfer._id}
                        icon={transfer.icon || "💸"}
                        title={transfer.title || "Transfer"}
                        amount={formatMinor(
                          transfer.amountMinor,
                          transfer.currency || group.currency,
                        )}
                        colors={colors}
                        onPress={() => openRecord("transfer", transfer._id)}
                        meta={
                          <Text
                            style={[
                              styles.meta,
                              { color: colors.textSecondary },
                            ]}
                            numberOfLines={2}
                          >
                            <MemberInline
                              member={from}
                              currentUserId={me?._id}
                              myMemberId={myMember?._id}
                            />
                            {" → "}
                            <MemberInline
                              member={to}
                              currentUserId={me?._id}
                              myMemberId={myMember?._id}
                            />
                            {" · "}
                            {formatRowTime(item.date)}
                          </Text>
                        }
                      />
                    );
                  }

                  const expense = item.expense;
                  const payers = payerMembers(expense, members);
                  const when = new Date(
                    expense.expenseDate || expense.createdAt || "",
                  );
                  return (
                    <FeedRow
                      key={expense._id}
                      icon={getExpenseEmoji(expense.icon, expense.categoryKey)}
                      title={expense.title}
                      amount={formatMinor(
                        expense.amountMinor,
                        expense.currency || group.currency,
                      )}
                      colors={colors}
                      onPress={() => openRecord("expense", expense._id)}
                      meta={
                        payers.length > 1 ? (
                          <View style={styles.paidRow}>
                            <Text
                              style={[
                                styles.meta,
                                { color: colors.textSecondary },
                              ]}
                            >
                              Paid by{" "}
                            </Text>
                            <View style={styles.avatars}>
                              {payers.slice(0, 3).map((m, i) => (
                                <View
                                  key={m._id}
                                  style={{
                                    marginLeft: i === 0 ? 0 : -4,
                                    zIndex: 3 - i,
                                    borderWidth: 1.5,
                                    borderColor: colors.softSurface,
                                    borderRadius: 10,
                                  }}
                                >
                                  <UserAvatar
                                    name={memberName(m)}
                                    avatar={m.avatar || m.user?.avatar}
                                    seed={m.userId || m._id}
                                    size={16}
                                  />
                                </View>
                              ))}
                            </View>
                            <Text
                              style={[
                                styles.meta,
                                {
                                  color: colors.textSecondary,
                                },
                              ]}
                            >
                              {" · "}
                              {formatRowTime(when)}
                            </Text>
                          </View>
                        ) : (
                          <Text
                            style={[
                              styles.meta,
                              { color: colors.textSecondary },
                            ]}
                            numberOfLines={2}
                          >
                            Paid by{" "}
                            <MemberInline
                              member={payers[0]}
                              currentUserId={me?._id}
                              myMemberId={myMember?._id}
                            />
                            {" · "}
                            {formatRowTime(when)}
                          </Text>
                        )
                      }
                    />
                  );
                })}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {canAdd ? (
        <Pressable
          onPress={openAdd}
          style={[styles.fab, { backgroundColor: colors.primary }]}
        >
          <MaterialIcons name="add" size={28} color="#ffffff" />
        </Pressable>
      ) : null}

      {group ? (
        <RecordDetailModal
          open={detailOpen}
          onClose={() => setDetailOpen(false)}
          items={feedItems}
          index={detailIndex}
          onIndexChange={setDetailIndex}
          group={group}
          currentUserId={me?._id}
          myMemberId={myMember?._id}
          onEditExpense={(item) => {
            setDetailOpen(false);
            router.push({
              pathname: "/group/[id]/add",
              params: { id: String(id), expenseId: item._id },
            });
          }}
          onEditTransfer={(item) => {
            setDetailOpen(false);
            router.push({
              pathname: "/group/[id]/add",
              params: { id: String(id), transferId: item._id },
            });
          }}
          onDeleted={() => {
            load();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function BalanceList({
  balance,
  currency,
}: {
  balance: GroupBalance | null;
  currency: string;
}) {
  const colors = useColors();
  const members = balance?.members || [];
  const pairwise = balance?.pairwise || [];

  if (!members.length) {
    return (
      <Text
        style={{
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: 24,
        }}
      >
        No balances yet.
      </Text>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {members.map((m) => {
        const net = m.netMinor || 0;
        const label =
          net > 0
            ? `gets back ${formatMinor(net, currency)}`
            : net < 0
              ? `owes ${formatMinor(-net, currency)}`
              : "settled up";
        return (
          <View
            key={m._id}
            style={[
              styles.expenseRow,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.expenseTitle, { color: colors.text }]}>
                {m.displayName || "Member"}
              </Text>
              <Text
                style={{
                  color:
                    net > 0
                      ? colors.success
                      : net < 0
                        ? colors.danger
                        : colors.textSecondary,
                  fontSize: 13,
                }}
              >
                {label}
              </Text>
            </View>
          </View>
        );
      })}
      {pairwise.length ? (
        <View style={{ marginTop: 8 }}>
          <Text style={[styles.dateHead, { color: colors.textSecondary }]}>
            SUGGESTED SETTLEMENTS
          </Text>
          {pairwise.map((p, i) => (
            <Text
              key={`${p.from}-${p.to}-${i}`}
              style={{ color: colors.text, marginBottom: 6 }}
            >
              {p.fromName} owes {p.toName}{" "}
              {formatMinor(p.amountMinor, currency)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  backRow: { flexDirection: "row", alignItems: "center", padding: 16 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
  },
  iconBtn: { padding: 6 },
  groupIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  groupTitle: { flex: 1, fontSize: 18, fontWeight: "700" },
  toggleWrap: { paddingHorizontal: 20, marginBottom: 8 },
  toggle: {
    alignSelf: "flex-start",
    flexDirection: "row",
    borderRadius: 999,
    padding: 4,
  },
  toggleBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },
  body: { paddingHorizontal: 20, paddingBottom: 110 },
  bodyEmpty: { flexGrow: 1, justifyContent: "center" },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingBottom: 56,
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyCopy: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280,
  },
  emptyAction: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "600",
  },
  dateHead: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 10,
    paddingHorizontal: 5,
  },
  expenseRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  expenseIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  expenseTitle: { fontSize: 15, fontWeight: "600", lineHeight: 20 },
  meta: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: "300",
    lineHeight: 15,
  },
  paidRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
    flexWrap: "wrap",
  },
  avatars: { flexDirection: "row", alignItems: "center" },
  amount: { fontSize: 14, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 24,
    bottom: 28,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
  },
  whoOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  whoBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  whoSheet: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    overflow: "hidden",
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  whoTitle: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  whoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
});
