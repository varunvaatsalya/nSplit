"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, Clock, MoreVertical, UserPlus } from "lucide-react";
import { BalanceView } from "@/components/balance/balance-view";
import { GroupFeed, buildFeed } from "@/components/groups/group-feed";
import { RecordDetailDialog } from "@/components/records/record-detail-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user-avatar";
import { memberName } from "@/lib/format";
import { groupBalance } from "@/lib/group-balance";
import { getGroupIcon } from "@/lib/group-options";
import { sortMembersByName } from "@/lib/members";
import { cn } from "@/lib/utils";
import { buildLedger } from "@/shared/ledger/index.js";

/** The logo: your groups when signed in, the home page otherwise. */
function Brand({ signedIn }) {
  return (
    <Link
      href={signedIn ? "/groups" : "/"}
      className="text-lg font-extrabold tracking-tight text-primary dark:text-primary-foreground"
      aria-label={signedIn ? "nSplit, my groups" : "nSplit home"}
    >
      nSplit
    </Link>
  );
}

function Shell({ children }) {
  return (
    <div className="nsplit-backdrop min-h-screen">
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-5 sm:px-6">{children}</div>
    </div>
  );
}

async function getJson(url, init) {
  const res = await fetch(url, { cache: "no-store", ...init });
  const json = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, json };
}

/** Pick which member you are; an admin approves it. Names already taken are disabled. */
function JoinDialog({ open, onOpenChange, members, me, token, onSent }) {
  const [memberId, setMemberId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    if (!memberId) return setError("Pick your name.");
    setSaving(true);
    setError("");
    try {
      const r = await getJson(`/api/share/${token}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      if (!r.ok) {
        setError(r.json?.error?.message || "Could not send the request.");
        return;
      }
      onSent(r.json.data);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,640px)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
          <DialogTitle>Which one is you?</DialogTitle>
          <DialogDescription>
            An admin approves it before you join. They will see your name ({me?.name}) and email ({me?.email}).
          </DialogDescription>
        </DialogHeader>
        <div className="nsplit-scroll min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
          {members.map((m) => {
            const selected = memberId === m._id;
            return (
              <button
                key={m._id}
                type="button"
                disabled={m.claimed}
                onClick={() => setMemberId(m._id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                  m.claimed ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-soft",
                  selected ? "border-primary bg-soft" : "border-border bg-surface",
                )}
              >
                <UserAvatar className="h-9 w-9" name={memberName(m)} avatar={m.avatar} seed={m._id} />
                <span className="min-w-0 flex-1 truncate font-semibold">{memberName(m)}</span>
                {m.claimed ? (
                  <span className="text-xs text-muted">Already joined</span>
                ) : selected ? (
                  <Check className="h-5 w-5 text-primary dark:text-indigo-300" />
                ) : null}
              </button>
            );
          })}
          {error ? <p className="text-sm text-danger">{error}</p> : null}
        </div>
        <DialogFooter className="shrink-0 border-t border-border p-4">
          <Button type="button" className="w-full" disabled={saving || !memberId} onClick={send}>
            {saving ? "Sending…" : "Send join request"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Join call-to-action, depending on where the viewer stands. */
function JoinPanel({ join, token, onJoin }) {
  if (!join) return null;
  if (join.status === "member") {
    return (
      <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-success/30 bg-success/5 p-3.5">
        <span className="text-sm font-semibold">You&apos;re a member of this group.</span>
        <Button asChild size="sm">
          <Link href={`/groups/${join.groupCode}`}>Open group</Link>
        </Button>
      </div>
    );
  }
  if (join.status === "pending") {
    return (
      <div className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
        <Clock className="h-5 w-5 shrink-0 text-warning" />
        <span className="text-sm">
          <span className="font-semibold">Join request sent</span>
          <span className="block text-muted">
            You asked to join as {join.request?.submitterName}. An admin needs to approve it.
          </span>
        </span>
      </div>
    );
  }
  const declined = join.status === "rejected";
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm">
        <span className="font-semibold">{declined ? "Your join request was declined" : "Part of this group?"}</span>
        <span className="block text-muted">
          {declined
            ? join.request?.rejectReason || "You can ask again with the right name."
            : "Join to see it in your groups and suggest expenses."}
        </span>
      </span>
      {join.status === "signed-out" ? (
        <Button asChild className="shrink-0">
          <Link href={`/login?next=${encodeURIComponent(`/s/${token}`)}`}>
            <UserPlus className="h-4 w-4" />
            Log in to join
          </Link>
        </Button>
      ) : (
        <Button className="shrink-0" onClick={onJoin}>
          <UserPlus className="h-4 w-4" />
          {declined ? "Ask again" : "Join group"}
        </Button>
      )}
    </div>
  );
}

/**
 * Public, read-only view of a group behind its share link. Anyone with the link
 * sees expenses and balances; signed-in people can ask an admin to join.
 */
export default function SharedLedgerPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [join, setJoin] = useState(null);
  const [me, setMe] = useState(null);
  const [saved, setSaved] = useState(false);
  const [view, setView] = useState("expenses");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailIndex, setDetailIndex] = useState(0);
  const [joinOpen, setJoinOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [ledger, meRes] = await Promise.all([getJson(`/api/share/${token}`), getJson("/api/auth/me")]);
        if (cancelled) return;
        setSignedIn(meRes.ok);
        if (meRes.ok) setMe(meRes.json.data.user);
        if (!ledger.ok) {
          setError(ledger.json?.error?.message || "This link was turned off or does not exist.");
          return;
        }
        setData(ledger.json.data);
        if (!meRes.ok) {
          setJoin({ status: "signed-out" });
          return;
        }
        const [status, sharesRes] = await Promise.all([getJson(`/api/share/${token}/join`), getJson("/api/shares")]);
        if (cancelled) return;
        setJoin(status.ok ? status.json.data : { status: "signed-out" });
        if (sharesRes.ok) setSaved(sharesRes.json.data.shares.some((s) => s.token === token));
      } catch {
        if (!cancelled) setError("Could not load this group. Check your connection and try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const group = useMemo(
    () => (data ? { ...data.group, members: sortMembersByName(data.group.members) } : null),
    [data],
  );
  const expenses = useMemo(() => data?.expenses || [], [data]);
  const transfers = useMemo(() => data?.transfers || [], [data]);
  const feed = useMemo(() => buildFeed(expenses, transfers), [expenses, transfers]);
  const ledger = useMemo(() => buildLedger(expenses, transfers), [expenses, transfers]);
  const balance = useMemo(() => (group ? groupBalance(group, expenses, transfers) : null), [group, expenses, transfers]);

  async function toggleSaved() {
    if (saved) {
      await fetch(`/api/shares/${token}`, { method: "DELETE" });
      setSaved(false);
    } else {
      const r = await getJson("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link: token }),
      });
      if (r.ok) setSaved(!r.json.data.member);
    }
  }

  if (error) {
    return (
      <Shell>
        <Brand signedIn={signedIn} />
        <div className="mt-10 text-center">
          {/* The artwork uses dark line work, so it sits on a light card in dark mode. */}
          <div className="mx-auto mb-4 w-56 sm:w-64 dark:rounded-3xl dark:bg-white/90 dark:p-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, nothing to optimize */}
            <img src="/illustrations/broken-bulb.svg" alt="" width={256} height={256} className="h-auto w-full" />
          </div>
          <p className="text-xl font-bold">Link unavailable</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{error}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Ask the person who shared it for a new link.</p>
        </div>
      </Shell>
    );
  }

  if (!group) {
    return (
      <Shell>
        <Brand signedIn={signedIn} />
        <div className="mt-8 space-y-3" aria-busy="true">
          <span className="block h-12 w-1/2 animate-pulse rounded-xl bg-soft" />
          <span className="block h-15 animate-pulse rounded-2xl bg-soft" />
          <span className="block h-15 animate-pulse rounded-2xl bg-soft" />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Brand signedIn={signedIn} />
        {signedIn && join ? (
          <div className="flex items-center gap-2">
            {join.status !== "member" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" size="icon" variant="outline" className="rounded-full" aria-label="Group options">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onSelect={toggleSaved} className={saved ? "text-danger" : undefined}>
                    {saved ? "Remove from my groups" : "Add to my groups"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-soft text-2xl">
          {getGroupIcon(group.icon).emoji}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{group.name}</h1>
          <p className="text-xs text-muted">View only · {group.members.length} members</p>
        </div>
      </div>

      <JoinPanel join={join} token={token} onJoin={() => setJoinOpen(true)} />

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
        >
          No expenses have been added to this group yet.
        </EmptyState>
      ) : view === "balance" ? (
        <BalanceView group={group} balance={balance} ledger={ledger} canSettle={false} />
      ) : (
        <GroupFeed
          items={feed}
          group={group}
          onOpen={(item) => {
            const idx = feed.findIndex((f) => f.kind === item.kind && f.id === item.id);
            if (idx < 0) return;
            setDetailIndex(idx);
            setDetailOpen(true);
          }}
        />
      )}

      <RecordDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        items={feed}
        index={detailIndex}
        onIndexChange={setDetailIndex}
        group={group}
        ledger={ledger}
      />

      {joinOpen ? (
        <JoinDialog
          open
          onOpenChange={setJoinOpen}
          members={group.members}
          me={me}
          token={token}
          onSent={(next) => setJoin(next)}
        />
      ) : null}

      <p className="mt-10 text-center text-xs text-muted">
        Kept with{" "}
        <Link href="/" className="font-bold text-primary dark:text-primary-foreground">
          nSplit
        </Link>{" "}
        · split expenses, settle cleanly
      </p>
    </Shell>
  );
}
