"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, History, Settings } from "lucide-react";
import { AddRecordModal } from "@/components/records/add-record-modal";
import { BalanceView } from "@/components/balance/balance-view";
import { GroupActivityDialog } from "@/components/groups/group-activity-dialog";
import { GroupFeed, buildFeed } from "@/components/groups/group-feed";
import { RecordDetailDialog } from "@/components/records/record-detail-dialog";
import { RequestsBanner, RequestsInbox } from "@/components/requests/requests-inbox";
import { Button } from "@/components/ui/button";
import { groupBalance } from "@/lib/group-balance";
import { getGroupIcon } from "@/lib/group-options";
import { cn } from "@/lib/utils";
import { sortMembersByName } from "@/lib/members";
import { buildLedger } from "@/shared/ledger/index.js";
import { Actions, can } from "@/shared/permissions";

function GroupPageSkeleton() {
  return (
    <div className="relative pb-24" aria-busy="true" aria-label="Loading group">
      <div className="mb-6 flex items-center gap-2">
        <Button type="button" size="icon" variant="ghost" asChild>
          <Link href="/groups" aria-label="Back to groups">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <span className="h-12 w-12 animate-pulse rounded-full bg-muted-foreground/15" />
        <span className="h-6 w-40 animate-pulse rounded-md bg-muted-foreground/15" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="block h-15 animate-pulse rounded-2xl bg-soft" />
        ))}
      </div>
    </div>
  );
}

export default function GroupDashboardPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("expenses");
  const [activityOpen, setActivityOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailIndex, setDetailIndex] = useState(0);
  const [editExpense, setEditExpense] = useState(null);
  const [editTransfer, setEditTransfer] = useState(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [inboxOpen, setInboxOpen] = useState(false);

  async function reload() {
    const [gRes, rRes, meRes, qRes] = await Promise.all([
      fetch(`/api/groups/${id}`),
      fetch(`/api/groups/${id}/records`),
      fetch("/api/auth/me"),
      fetch(`/api/groups/${id}/requests`),
    ]);
    // Only members who can add records may review requests; others get 403.
    if (qRes.ok) {
      const qJson = await qRes.json().catch(() => null);
      setPendingRequests(qJson?.data?.pending || 0);
    }
    const [gJson, rJson, meJson] = await Promise.all([gRes.json(), rRes.json(), meRes.json()]);
    if (!gRes.ok) {
      setError(gJson?.error?.message || "Failed to load group");
      return;
    }
    setError("");
    setGroup({ ...gJson.data.group, members: sortMembersByName(gJson.data.group?.members || []) });
    if (rRes.ok) {
      setExpenses(rJson.data.expenses || []);
      setTransfers(rJson.data.transfers || []);
    }
    if (meRes.ok) setMe(meJson.data.user);
  }

  useEffect(() => {
    // Loading from the API is the external system this effect syncs with.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const feed = useMemo(() => buildFeed(expenses, transfers), [expenses, transfers]);
  const ledger = useMemo(() => buildLedger(expenses, transfers), [expenses, transfers]);
  const balance = useMemo(() => (group ? groupBalance(group, expenses, transfers) : null), [group, expenses, transfers]);

  const members = useMemo(() => group?.members || [], [group?.members]);
  const myMember = useMemo(
    () => (me?._id ? members.find((m) => m.userId && String(m.userId) === String(me._id)) : null),
    [members, me],
  );
  const canAdd = can(myMember?.permission, Actions.ADD_EXPENSE);
  const canSettle = can(myMember?.permission, Actions.ADD_TRANSFER);

  function openItem(item) {
    const idx = feed.findIndex((f) => f.kind === item.kind && f.id === item.id);
    if (idx < 0) return;
    setDetailIndex(idx);
    setDetailOpen(true);
  }

  if (error) return <p className="text-danger">{error}</p>;
  if (!group) return <GroupPageSkeleton />;

  const iconMeta = getGroupIcon(group.icon);

  return (
    <div className="relative pb-24">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button type="button" size="icon" variant="ghost" asChild>
            <Link href="/groups" aria-label="Back to groups">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-soft text-2xl">
            {iconMeta.emoji}
          </span>
          <h1 className="min-w-0 truncate px-1 text-lg font-bold tracking-tight sm:text-xl">{group.name}</h1>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="rounded-full"
            onClick={() => setActivityOpen(true)}
            aria-label="Activity"
          >
            <History className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="outline" className="rounded-full" asChild>
            <Link href={`/groups/${id}/settings`} aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <RequestsBanner count={pendingRequests} onOpen={() => setInboxOpen(true)} />

      <div className="mb-5 flex justify-start">
        <div className="inline-flex rounded-full bg-muted-foreground/10 p-1">
          {[
            ["expenses", "Expenses"],
            ["balance", "Balance"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              className={cn(
                "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                view === key ? "border border-border bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {feed.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-14 text-center">
          <p className="text-xl font-bold">{view === "balance" ? "No balances yet" : "No expenses yet"}</p>
          <p className="mt-1.5 max-w-xs text-sm leading-5 text-muted">
            {view === "balance"
              ? "Balances appear here after you add an expense to this group."
              : "Add the first expense to start splitting with this group."}
          </p>
        </div>
      ) : view === "balance" ? (
        <BalanceView
          group={group}
          balance={balance}
          ledger={ledger}
          currentUserId={me?._id}
          canSettle={canSettle}
          exportHref={`/groups/${id}/export`}
          onPaid={reload}
        />
      ) : (
        <GroupFeed items={feed} group={group} currentUserId={me?._id} onOpen={openItem} />
      )}

      <AddRecordModal
        group={group}
        currentUserId={me?._id}
        canAdd={canAdd}
        onCreated={reload}
        editExpense={editExpense}
        editTransfer={editTransfer}
        onEditClose={() => {
          setEditExpense(null);
          setEditTransfer(null);
        }}
      />

      <GroupActivityDialog groupId={id} open={activityOpen} onOpenChange={setActivityOpen} />

      <RequestsInbox open={inboxOpen} onOpenChange={setInboxOpen} group={group} onReviewed={reload} />

      <RecordDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        items={feed}
        index={detailIndex}
        onIndexChange={setDetailIndex}
        group={group}
        ledger={ledger}
        currentUserId={me?._id}
        onEditExpense={(expense) => {
          setDetailOpen(false);
          setEditExpense(expense);
        }}
        onEditTransfer={(transfer) => {
          setDetailOpen(false);
          setEditTransfer(transfer);
        }}
        onDeleted={() => {
          setDetailOpen(false);
          reload();
        }}
      />
    </div>
  );
}
