"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, Copy, Eye, Plus, Smartphone } from "lucide-react";
import { BalanceView } from "@/components/balance/balance-view";
import { GroupFeed, buildFeed } from "@/components/groups/group-feed";
import { RecordDetailDialog } from "@/components/records/record-detail-dialog";
import { RequestFormDialog } from "@/components/requests/request-form-dialog";
import { RequestSummary } from "@/components/requests/request-summary";
import { UserAvatar } from "@/components/user-avatar";
import { formatMinor, memberName } from "@/lib/format";
import { groupBalance } from "@/lib/group-balance";
import { getGroupIcon } from "@/lib/group-options";
import { sortMembersByName } from "@/lib/members";
import { cn } from "@/lib/utils";
import { buildLedger } from "@/shared/ledger/index.js";
import { buildUpiLink } from "@/shared/upi/index.js";

const JUST_LOOKING = "__viewer__";

/** Per-browser memory of "who am I" for this link (a convenience, never required). */
function storageKey(token) {
  return `nsplit-share-me:${token}`;
}

function readMe(token) {
  try {
    return window.localStorage.getItem(storageKey(token));
  } catch {
    return null;
  }
}

function writeMe(token, value) {
  try {
    if (value) window.localStorage.setItem(storageKey(token), value);
    else window.localStorage.removeItem(storageKey(token));
  } catch {
    // Private mode: the choice just isn't remembered.
  }
}

let memoryViewerKey = null;

/** Random id for this browser, so a viewer can follow their own requests. */
function viewerKey() {
  try {
    let key = window.localStorage.getItem("nsplit-viewer-key");
    if (!key) {
      key = crypto.randomUUID().replace(/-/g, "");
      window.localStorage.setItem("nsplit-viewer-key", key);
    }
    return key;
  } catch {
    memoryViewerKey = memoryViewerKey || crypto.randomUUID().replace(/-/g, "");
    return memoryViewerKey;
  }
}

function Brand() {
  return (
    <Link href="/" className="text-lg font-extrabold tracking-tight text-primary dark:text-primary-foreground">
      nSplit
    </Link>
  );
}

function Shell({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-5 sm:px-6">{children}</div>
    </div>
  );
}

function PaidAlready({ onReport }) {
  if (!onReport) return null;
  return (
    <button
      type="button"
      onClick={onReport}
      className="mx-auto mt-2 block cursor-pointer text-xs font-bold text-primary hover:underline dark:text-primary-foreground"
    >
      Already paid? Tell the group
    </button>
  );
}

function UpiPay({ payee, amountMinor, currency, groupName, onReport }) {
  const [copied, setCopied] = useState(false);
  if (currency !== "INR") return <PaidAlready onReport={onReport} />;
  if (!payee?.upiId) {
    return (
      <>
        <p className="mt-2 text-center text-xs text-muted">
          {memberName(payee)} hasn&apos;t added a UPI ID yet. Ask them for it.
        </p>
        <PaidAlready onReport={onReport} />
      </>
    );
  }
  const href = buildUpiLink({
    upiId: payee.upiId,
    name: memberName(payee),
    amountMinor,
    currency,
    note: `${groupName} · nSplit`,
  });
  return (
    <div className="mt-2.5">
      <a
        href={href}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
      >
        <Smartphone className="h-4 w-4" />
        Pay {formatMinor(amountMinor, currency)} via UPI
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(payee.upiId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {
            // Clipboard blocked: the id is visible to copy by hand.
          }
        }}
        className="mx-auto mt-1.5 flex cursor-pointer items-center gap-1 text-xs text-muted hover:text-foreground"
      >
        UPI: <span className="font-semibold">{payee.upiId}</span>
        {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      </button>
      <p className="mt-1 text-center text-[11px] text-muted">The button opens your UPI app on a phone.</p>
      <PaidAlready onReport={onReport} />
    </div>
  );
}

function WhoAreYou({ group, onPick }) {
  return (
    <div className="mx-auto max-w-md">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-soft text-3xl">
          {getGroupIcon(group.icon).emoji}
        </span>
        <h1 className="mt-3 text-[22px] font-bold">{group.name}</h1>
        <p className="mt-4 text-lg font-bold">Who are you?</p>
        <p className="mt-1 max-w-xs text-sm text-muted">
          Pick your name to see what you owe and get back. This only changes what this page highlights.
        </p>
      </div>
      <ul className="space-y-2">
        {group.members.map((m) => (
          <li key={m._id}>
            <button
              type="button"
              onClick={() => onPick(m._id)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left transition-colors hover:bg-soft"
            >
              <UserAvatar className="h-10 w-10" name={memberName(m)} avatar={m.avatar} seed={m._id} />
              <span className="min-w-0 flex-1 truncate text-[15px] font-bold">{memberName(m)}</span>
              <ChevronRight className="h-5 w-5 text-muted" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onPick(JUST_LOOKING)}
        className="mx-auto mt-4 flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-muted hover:text-foreground"
      >
        <Eye className="h-4 w-4" />
        I&apos;m just looking
      </button>
    </div>
  );
}

function MySummary({ me, balance, memberById, currency, groupName, onReportPayment }) {
  const row = balance.members.find((m) => m._id === me._id);
  const net = row?.netMinor || 0;
  const iPay = balance.pairwise.filter((p) => p.from === me._id);
  const paysMe = balance.pairwise.filter((p) => p.to === me._id);

  return (
    <div className="mb-5 rounded-[18px] border border-border bg-surface p-4">
      <div className="text-center">
        <div className={cn("text-[13px] font-semibold", net < 0 ? "text-danger" : net > 0 ? "text-success" : "text-muted")}>
          {net < 0 ? "You owe" : net > 0 ? "You get back" : "You're settled up"}
        </div>
        {net !== 0 ? (
          <div className={cn("mt-0.5 text-[30px] font-extrabold tabular-nums", net < 0 ? "text-danger" : "text-success")}>
            {formatMinor(Math.abs(net), currency)}
          </div>
        ) : null}
      </div>

      {iPay.map((p) => (
        <div key={`${p.from}-${p.to}`} className="mt-4 border-t border-border pt-3">
          <p className="text-center text-sm font-semibold">
            Pay {memberName(memberById[p.to])} {formatMinor(p.amountMinor, currency)}
          </p>
          <UpiPay
            payee={memberById[p.to]}
            amountMinor={p.amountMinor}
            currency={currency}
            groupName={groupName}
            onReport={() => onReportPayment(p)}
          />
        </div>
      ))}
      {paysMe.length ? (
        <ul className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          {paysMe.map((p) => (
            <li key={`${p.from}-${p.to}`} className="flex justify-between gap-3">
              <span className="truncate">{memberName(memberById[p.from])} pays you</span>
              <span className="font-bold tabular-nums text-success">{formatMinor(p.amountMinor, currency)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function SharedLedgerPage() {
  const { token } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [meId, setMeId] = useState(undefined);
  const [view, setView] = useState("expenses");
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailIndex, setDetailIndex] = useState(0);
  const [myRequests, setMyRequests] = useState([]);
  const [form, setForm] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/share/${token}`, { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (cancelled) return;
        if (!res.ok) {
          setError(json?.error?.message || "This link was turned off or does not exist.");
          return;
        }
        setData(json.data);
        setMeId(readMe(token));
      } catch {
        if (!cancelled) setError("Could not load this ledger. Check your connection and try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Viewers have no account. Give every member a userId equal to its own id, so the
  // shared components treat the picked member as "(me)" and never offer edit actions.
  const group = useMemo(() => {
    if (!data) return null;
    return {
      ...data.group,
      members: sortMembersByName(data.group.members.map((m) => ({ ...m, userId: m._id }))),
    };
  }, [data]);
  const expenses = useMemo(() => data?.expenses || [], [data]);
  const transfers = useMemo(() => data?.transfers || [], [data]);
  const feed = useMemo(() => buildFeed(expenses, transfers), [expenses, transfers]);
  const ledger = useMemo(() => buildLedger(expenses, transfers), [expenses, transfers]);
  const balance = useMemo(() => (group ? groupBalance(group, expenses, transfers) : null), [group, expenses, transfers]);

  function pick(id) {
    writeMe(token, id);
    setMeId(id);
  }

  async function loadMyRequests() {
    try {
      const res = await fetch(`/api/share/${token}/requests?viewerKey=${viewerKey()}`, { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (res.ok) setMyRequests(json.data.requests || []);
    } catch {
      // Not critical: the list just stays as it was.
    }
  }

  useEffect(() => {
    if (!data) return;
    // Fetching from the API is the external system this effect syncs with.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMyRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, token]);

  if (error) {
    return (
      <Shell>
        <Brand />
        <div className="mt-16 text-center">
          <p className="text-xl font-bold">Link unavailable</p>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{error}</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted">Ask the person who shared it for a new link.</p>
        </div>
      </Shell>
    );
  }

  if (!group || meId === undefined) {
    return (
      <Shell>
        <Brand />
        <div className="mt-8 space-y-3" aria-busy="true">
          <span className="mx-auto block h-16 w-16 animate-pulse rounded-full bg-soft" />
          <span className="mx-auto block h-6 w-40 animate-pulse rounded-md bg-soft" />
          <span className="block h-15 animate-pulse rounded-2xl bg-soft" />
          <span className="block h-15 animate-pulse rounded-2xl bg-soft" />
        </div>
      </Shell>
    );
  }

  const memberById = Object.fromEntries(group.members.map((m) => [m._id, m]));
  const me = meId && meId !== JUST_LOOKING ? memberById[meId] : null;

  if (!meId || (meId !== JUST_LOOKING && !me)) {
    return (
      <Shell>
        <Brand />
        <div className="mt-6">
          <WhoAreYou group={group} onPick={pick} />
        </div>
      </Shell>
    );
  }

  const currency = group.currency || "INR";

  return (
    <Shell>
      <div className="mb-5 flex items-center justify-between gap-3">
        <Brand />
        <button
          type="button"
          onClick={() => pick(null)}
          className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface py-1 pl-1 pr-3 text-xs font-semibold hover:bg-soft"
        >
          {me ? (
            <UserAvatar className="h-6 w-6" fallbackClassName="text-[9px]" name={memberName(me)} avatar={me.avatar} seed={me._id} />
          ) : (
            <Eye className="ml-1.5 h-4 w-4 text-muted" />
          )}
          {me ? `Viewing as ${memberName(me)}` : "Just looking"} · Change
        </button>
      </div>

      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-soft text-2xl">
          {getGroupIcon(group.icon).emoji}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{group.name}</h1>
          <p className="text-xs text-muted">Shared ledger · read only · {group.members.length} members</p>
        </div>
      </div>

      {me && balance ? (
        <MySummary
          me={me}
          balance={balance}
          memberById={memberById}
          currency={currency}
          groupName={group.name}
          onReportPayment={(p) => setForm({ kind: "payment", toMemberId: p.to, amountMinor: p.amountMinor })}
        />
      ) : null}

      {myRequests.length ? (
        <div className="mb-5">
          <div className="mb-2 text-[11px] font-bold tracking-[0.06em] text-muted">YOUR REQUESTS</div>
          <div className="space-y-2">
            {myRequests.slice(0, 5).map((r) => (
              <RequestSummary key={r._id} request={r} byId={memberById} currency={currency} />
            ))}
          </div>
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
        <p className="py-14 text-center text-sm text-muted">No expenses in this group yet.</p>
      ) : view === "balance" ? (
        <BalanceView
          group={group}
          balance={balance}
          ledger={ledger}
          currentUserId={me?._id}
          canSettle={false}
          payAction={(p) =>
            me && p.from === me._id ? (
              <UpiPay
                payee={memberById[p.to]}
                amountMinor={p.amountMinor}
                currency={currency}
                groupName={group.name}
                onReport={() => setForm({ kind: "payment", toMemberId: p.to, amountMinor: p.amountMinor })}
              />
            ) : null
          }
        />
      ) : (
        <GroupFeed
          items={feed}
          group={group}
          currentUserId={me?._id}
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
        currentUserId={me?._id}
      />

      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40">
        <div className="mx-auto flex max-w-3xl justify-end px-4 sm:px-6">
          <button
            type="button"
            onClick={() => (me ? setForm({ kind: "expense" }) : pick(null))}
            className="pointer-events-auto flex h-12 cursor-pointer items-center gap-2 rounded-full bg-primary px-5 font-bold text-primary-foreground shadow-lg shadow-primary/25 transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="h-5 w-5" />
            {me ? "Add expense or payment" : "Pick your name to add"}
          </button>
        </div>
      </div>

      {me && form ? (
        <RequestFormDialog
          key={JSON.stringify(form)}
          open
          onOpenChange={(open) => !open && setForm(null)}
          token={token}
          viewerKey={viewerKey()}
          me={me}
          members={group.members}
          currency={currency}
          preset={form}
          onSent={() => loadMyRequests()}
        />
      ) : null}

      <p className="mb-16 mt-10 text-center text-xs text-muted">
        Kept with{" "}
        <Link href="/" className="font-bold text-primary dark:text-primary-foreground">
          nSplit
        </Link>{" "}
        · split expenses, settle cleanly
      </p>
    </Shell>
  );
}
