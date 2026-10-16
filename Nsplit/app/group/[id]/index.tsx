import { Feather, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { BalanceView } from "@/components/balance/balance-view";
import { GroupFeed, groupFeedItems, type FeedItem } from "@/components/groups/group-feed";
import { RecordDetailModal } from "@/components/records/record-detail-modal";
import { useColors } from "@/hooks/use-colors";
import type { Expense, GroupBalance, GroupDetail, Transfer } from "@/src/api/types";
import { useAuth } from "@/src/auth/auth-context";
import { groupBalance, listExpenses } from "@/src/db/expenses";
import { listPendingRequests } from "@/src/api/requests";
import { getGroup, isGroupSynced } from "@/src/db/groups";
import { useOffline } from "@/src/offline/offline-context";
import { listTransfers } from "@/src/db/transfers";
import { useIdentity } from "@/src/identity/identity-context";
import { remoteChanges } from "@/src/sync/events";
import { useSync } from "@/src/sync/sync-context";
import { buildLedger } from "@/src/lib/ledger";
import { getGroupEmoji } from "@/src/lib/icons";
import { resolveMyMember } from "@/src/lib/members";

export default function GroupScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuth();
  const { syncNow } = useSync();
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
      const handle = requestIdleCallback(() => {
        load();
      });
      return () => cancelIdleCallback(handle);
    }, [load]),
  );

  const { online } = useOffline();
  const [pendingRequests, setPendingRequests] = useState(0);

  // Requests from the share link live on the server; only check when that can work.
  const refreshRequests = useCallback(async () => {
    if (!user || !online || !id) return;
    const local = await getGroup(String(id));
    if (!local || !(await isGroupSynced(local._id))) return;
    const res = await listPendingRequests(local.code);
    if (res.ok && res.data) setPendingRequests(res.data.pending);
  }, [id, user, online]);

  useFocusEffect(
    useCallback(() => {
      refreshRequests().catch(() => {});
    }, [refreshRequests]),
  );

  // Another device (or the web) changed this group.
  useEffect(() => remoteChanges.subscribe(() => void load().catch(() => {})), [load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await syncNow().catch(() => {});
      await Promise.all([load(), refreshRequests().catch(() => {})]);
    } finally {
      setRefreshing(false);
    }
  }

  const members = group?.members || [];
  const ledger = useMemo(() => buildLedger(expenses, transfers), [expenses, transfers]);
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
  // Joined via the link: views everything, sends additions for approval.
  const isMember = group?.myPermission === "VIEW_ONLY";
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
        {/* {!feedEmpty ? (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/group/[id]/export", params: { id: String(id) } })
            }
            hitSlop={10}
            style={styles.iconBtn}
          >
            <MaterialIcons name="ios-share" size={22} color={colors.text} />
          </Pressable>
        ) : null} */}
        {user && group.myPermission ? (
          <Pressable
            onPress={() =>
              router.push({ pathname: "/group/[id]/requests", params: { id: String(id) } })
            }
            hitSlop={10}
            style={styles.iconBtn}
            accessibilityLabel={
              pendingRequests ? `Requests, ${pendingRequests} waiting` : "Requests"
            }
          >
            <Feather name="bell" size={22} color={colors.text} />
            {pendingRequests > 0 ? (
              <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                <Text style={styles.badgeText}>
                  {pendingRequests > 9 ? "9+" : pendingRequests}
                </Text>
              </View>
            ) : null}
          </Pressable>
        ) : null}
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
          <BalanceView
            group={group}
            balance={balance}
            ledger={ledger}
            currentUserId={me?._id}
            myMemberId={myMember?._id}
            onPaid={load}
            canSettle={!isMember}
            onExport={() =>
              router.push({ pathname: "/group/[id]/export", params: { id: String(id) } })
            }
          />
        ) : (
          <GroupFeed
            sections={grouped}
            members={members}
            currency={group.currency || "INR"}
            currentUserId={me?._id}
            myMemberId={myMember?._id}
            onOpen={openRecord}
          />
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
          ledger={ledger}
          readOnly={isMember}
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
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
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
    ...StyleSheet.absoluteFill,
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
