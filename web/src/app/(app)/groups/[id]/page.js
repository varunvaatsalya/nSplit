"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Bell, Check, History, Settings } from "lucide-react";
import { AddRecordModal } from "@/components/records/add-record-modal";
import { BalanceView } from "@/components/balance/balance-view";
import { GroupActivityDialog } from "@/components/groups/group-activity-dialog";
import { GroupFeed, buildFeed } from "@/components/groups/group-feed";
import { RecordDetailDialog } from "@/components/records/record-detail-dialog";
import { GroupLoadError, groupErrorFrom } from "@/components/groups/group-load-error";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
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
  const [loadError, setLoadError] = useState(null);
  const [view, setView] = useState("expenses");
  const [activityOpen, setActivityOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailIndex, setDetailIndex] = useState(0);
  const [editExpense, setEditExpense] = useState(null);
  const [editTransfer, setEditTransfer] = useState(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [requestSent, setRequestSent] = useState(false);
  const addRef = useRef(null);

  async function reload() {
    const [gRes, rRes, meRes, qRes] = await Promise.all([
      fetch(`/api/groups/${id}`),
      fetch(`/api/groups/${id}/records`),
      fetch("/api/auth/me"),
      fetch(`/api/groups/${id}/requests`),
    ]);
    // Reviewers get the pending count; members get only their own requests.
    if (qRes.ok) {
      const qJson = await qRes.json().catch(() => null);
      setPendingRequests(qJson?.data?.pending || 0);
    }
    const [gJson, rJson, meJson] = await Promise.all([gRes.json(), rRes.json(), meRes.json()]);
    if (!gRes.ok) {
      setLoadError(groupErrorFrom(gRes, gJson));
      return;
    }
    setLoadError(null);
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

  if (loadError) return <GroupLoadError error={loadError} onRetry={reload} />;
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
          <Button type="button" size="icon" variant="outline" className="relative rounded-full" asChild>
            <Link href={`/groups/${id}/requests`} aria-label={pendingRequests ? `Requests (${pendingRequests} waiting)` : "Requests"}>
              <Bell className="h-4 w-4" />
              {pendingRequests ? (
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                  {pendingRequests > 9 ? "9+" : pendingRequests}
                </span>
              ) : null}
            </Link>
          </Button>
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

      {requestSent ? (
        <div className="mb-5 flex items-center gap-2 rounded-2xl bg-success/10 px-3.5 py-2.5 text-sm font-semibold text-success" role="status">
          <Check className="h-4 w-4" />
          Sent for approval. You can follow it under Requests.
        </div>
      ) : null}

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
        <EmptyState
          illustration={view === "balance" ? "/illustrations/balence-amico.svg" : "/illustrations/add-notes-amico.svg"}
          title={view === "balance" ? "No balances yet" : "Nothing here yet"}
          actions={
            <Button type="button" variant="link" onClick={() => addRef.current?.openCreate()}>
              Add expense
            </Button>
          }
        >
          {view === "balance"
            ? "Balances appear here after you add an expense to this group."
            : "Add the first expense to start splitting with this group."}
        </EmptyState>
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
        ref={addRef}
        group={group}
        currentUserId={me?._id}
        canAdd={canAdd}
        requestMode={!canAdd}
        onRequested={() => setRequestSent(true)}
        onCreated={reload}
        editExpense={editExpense}
        editTransfer={editTransfer}
        onEditClose={() => {
          setEditExpense(null);
          setEditTransfer(null);
        }}
      />

      <GroupActivityDialog groupId={id} open={activityOpen} onOpenChange={setActivityOpen} />


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
