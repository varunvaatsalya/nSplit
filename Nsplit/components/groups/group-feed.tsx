import { type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { UserAvatar } from "@/components/user-avatar";
import { useColors } from "@/hooks/use-colors";
import type { Expense, GroupMember, Transfer } from "@/src/api/types";
import { dateHeaderLabel, formatMinor, formatRowTime, memberName } from "@/src/lib/format";
import { getExpenseEmoji } from "@/src/lib/icons";
import { isSelfMember } from "@/src/lib/members";

export type FeedItem =
  | { kind: "expense"; id: string; date: Date; expense: Expense }
  | { kind: "transfer"; id: string; date: Date; transfer: Transfer };

function feedDayKey(date: Date) {
  if (Number.isNaN(date.getTime())) return "unknown";
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/** Expenses and transfers grouped by day, newest first. */
export function groupFeedItems(expenses: Expense[], transfers: Transfer[]) {
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
}) {
  const self = isSelfMember(member, currentUserId, myMemberId);
  return (
    <>
      <Text style={{ fontWeight: "700", fontSize: 12 }}>{memberName(member)}</Text>
      {self ? <Text style={{ fontSize: 11, fontWeight: "700" }}> (me)</Text> : null}
    </>
  );
}

function FeedRow({
  icon,
  title,
  amount,
  meta,
  onPress,
}: {
  icon: string;
  title: string;
  amount: string;
  meta: ReactNode;
  onPress?: () => void;
}) {
  const colors = useColors();
  const body = (
    <>
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <View style={styles.expenseIcon}>
          <Text style={{ fontSize: 24 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.expenseTitle, { color: colors.text }]} numberOfLines={2}>
            {title}
          </Text>
          {meta}
        </View>
      </View>
      <Text style={[styles.amount, { color: colors.text, flexShrink: 0, paddingRight: 8 }]}>{amount}</Text>
    </>
  );
  const rowStyle = [styles.expenseRow, { backgroundColor: colors.softSurface }];
  if (onPress) {
    return (
      <Pressable onPress={onPress} className="flex-row items-center gap-3" style={rowStyle}>
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

/** Expenses and transfers by day, newest first (group screen and shared view). */
export function GroupFeed({
  sections,
  members,
  currency,
  currentUserId,
  myMemberId,
  onOpen,
}: {
  sections: ReturnType<typeof groupFeedItems>;
  members: GroupMember[];
  currency: string;
  currentUserId?: string | null;
  myMemberId?: string | null;
  onOpen: (kind: FeedItem["kind"], id: string) => void;
}) {
  const colors = useColors();
  return (
    <>
      {sections.map((section) => (
        <View key={section.key} style={{ marginBottom: 18 }}>
          <Text style={[styles.dateHead, { color: colors.text }]}>{dateHeaderLabel(section.date)}</Text>
          <View style={{ gap: 10 }}>
            {section.items.map((item) => {
              if (item.kind === "transfer") {
                const transfer = item.transfer;
                const from = members.find((m) => m._id === transfer.fromMemberId);
                const to = members.find((m) => m._id === transfer.toMemberId);
                return (
                  <FeedRow
                    key={transfer._id}
                    icon={transfer.icon || "💸"}
                    title={transfer.title || "Transfer"}
                    amount={formatMinor(transfer.amountMinor, transfer.currency || currency)}
                    onPress={() => onOpen("transfer", transfer._id)}
                    meta={
                      <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={2}>
                        <MemberInline member={from} currentUserId={currentUserId} myMemberId={myMemberId} />
                        {" → "}
                        <MemberInline member={to} currentUserId={currentUserId} myMemberId={myMemberId} />
                        {" · "}
                        {formatRowTime(item.date)}
                      </Text>
                    }
                  />
                );
              }

              const expense = item.expense;
              const payers = payerMembers(expense, members);
              const when = new Date(expense.expenseDate || expense.createdAt || "");
              return (
                <FeedRow
                  key={expense._id}
                  icon={getExpenseEmoji(expense.icon, expense.categoryKey)}
                  title={expense.title}
                  amount={formatMinor(expense.amountMinor, expense.currency || currency)}
                  onPress={() => onOpen("expense", expense._id)}
                  meta={
                    payers.length > 1 ? (
                      <View style={styles.paidRow}>
                        <Text style={[styles.meta, { color: colors.textSecondary }]}>Paid by </Text>
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
                        <Text style={[styles.meta, { color: colors.textSecondary }]}>
                          {" · "}
                          {formatRowTime(when)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={2}>
                        Paid by{" "}
                        <MemberInline member={payers[0]} currentUserId={currentUserId} myMemberId={myMemberId} />
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
      ))}
    </>
  );
}

const styles = StyleSheet.create({
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
});
