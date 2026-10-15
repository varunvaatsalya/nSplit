"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronRight, FileText } from "lucide-react";
import { MemberLedgerSheet } from "@/components/balance/member-ledger-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { formatMinor, memberName } from "@/lib/format";
import { isSelfMember, memberListLabel } from "@/lib/members";
import { memberTotals } from "@/shared/ledger/index.js";
import { cn } from "@/lib/utils";

function MemberChip({ member, currentUserId }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center">
      <UserAvatar
        className="h-9 w-9"
        name={memberName(member)}
        avatar={member?.avatar || member?.user?.avatar}
        seed={member?.userId || member?._id}
      />
      <span className="mt-1.5 max-w-full truncate text-xs font-bold">{memberListLabel(member, currentUserId)}</span>
    </div>
  );
}

/**
 * Who owes, who gets back, suggested payments and per-member balance sheets
 * (same layout as the app's Balance tab).
 */
export function BalanceView({ group, balance, ledger, currentUserId, canSettle, exportHref, onPaid, payAction }) {
  const members = useMemo(() => group.members || [], [group.members]);
  const currency = group.currency || "INR";
  const [pending, setPending] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sheetMemberId, setSheetMemberId] = useState(null);

  const memberById = useMemo(() => Object.fromEntries(members.map((m) => [m._id, m])), [members]);

  const { owe, getBack, settled } = useMemo(() => {
    const list = [...(balance?.members || [])];
    return {
      owe: list.filter((m) => m.netMinor < 0).sort((a, b) => a.netMinor - b.netMinor),
      getBack: list.filter((m) => m.netMinor > 0).sort((a, b) => b.netMinor - a.netMinor),
      settled: list.filter((m) => m.netMinor === 0),
    };
  }, [balance?.members]);

  const pairwise = balance?.pairwise || [];
  const unsettled = pairwise.reduce((sum, row) => sum + row.amountMinor, 0);

  async function confirmPaid() {
    if (!pending || saving) return;
    setSaving(true);
    setError("");
    try {
      const fromName = memberName(memberById[pending.from]);
      const toName = memberName(memberById[pending.to]);
      const res = await fetch(`/api/groups/${group.code}/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `${fromName} paid ${toName}`,
          icon: "💸",
          amountMinor: pending.amountMinor,
          fromMemberId: pending.from,
          toMemberId: pending.to,
          currency,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setError(json?.error?.message || "Could not mark as paid.");
        return;
      }
      setPending(null);
      await onPaid?.();
    } finally {
      setSaving(false);
    }
  }

  function renderMember(m, kind) {
    const member = memberById[m._id];
    const self = isSelfMember(member, currentUserId);
    const tone = kind === "owe" ? "text-danger" : kind === "get" ? "text-success" : "text-muted";
    const amount =
      kind === "owe"
        ? `−${formatMinor(-m.netMinor, currency)}`
        : kind === "get"
          ? `+${formatMinor(m.netMinor, currency)}`
          : formatMinor(0, currency);
    const totals = memberTotals(ledger, m._id);
    return (
      <button
        key={m._id}
        type="button"
        onClick={() => setSheetMemberId(m._id)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-2xl border bg-surface p-3 text-left transition-colors hover:bg-soft",
          self ? "border-primary" : "border-border",
        )}
      >
        <UserAvatar
          className="h-10 w-10"
          name={memberName(member || m)}
          avatar={member?.avatar || member?.user?.avatar}
          seed={member?.userId || m._id}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold">{memberListLabel(member || m, currentUserId)}</div>
          <div className={cn("mt-0.5 text-xs font-semibold", tone)}>
            {kind === "owe" ? "Needs to pay" : kind === "get" ? "Gets back" : "Settled up"}
          </div>
          <div className="mt-0.5 truncate text-[11px] text-muted">
            Paid {formatMinor(totals.paidMinor, currency)} · Share {formatMinor(totals.shareMinor, currency)}
          </div>
        </div>
        <span className={cn("shrink-0 text-base font-extrabold tabular-nums", tone)}>{amount}</span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
      </button>
    );
  }

  if (!balance?.members?.length) {
    return <p className="mt-6 text-center text-sm text-muted">No balances yet.</p>;
  }

  const section = "mb-2 px-0.5 text-[13px] font-extrabold uppercase tracking-[0.03em]";

  return (
    <div className="space-y-4.5">
      {exportHref ? (
      <Link
        href={exportHref}
        className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:bg-soft"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-primary-foreground">
          <FileText className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">Export details</span>
          <span className="mt-0.5 block text-xs text-muted">PDF ledger · pick a date range</span>
        </span>
        <ChevronRight className="h-5 w-5 text-muted" />
      </Link>
      ) : null}

      <p className="-mb-2 px-0.5 text-xs text-muted">Tap a member to see their balance sheet.</p>

      {owe.length ? (
        <div>
          <div className={cn(section, "text-danger")}>Owes</div>
          <div className="space-y-2">{owe.map((m) => renderMember(m, "owe"))}</div>
        </div>
      ) : null}
      {getBack.length ? (
        <div>
          <div className={cn(section, "text-success")}>Gets back</div>
          <div className="space-y-2">{getBack.map((m) => renderMember(m, "get"))}</div>
        </div>
      ) : null}
      {settled.length ? (
        <div>
          <div className={cn(section, "text-muted")}>Settled</div>
          <div className="space-y-2">{settled.map((m) => renderMember(m, "settled"))}</div>
        </div>
      ) : null}

      <div>
        <div className={section}>Suggested payments</div>
        {pairwise.length ? (
          <div className="space-y-2.5">
            <p className="text-[13px] text-muted">{formatMinor(unsettled, currency)} still to settle</p>
            {pairwise.map((p, i) => {
              const from = memberById[p.from];
              const to = memberById[p.to];
              return (
                <div key={`${p.from}-${p.to}-${i}`} className="rounded-[18px] border border-border bg-surface p-3.5">
                  <div className="mb-3 flex items-center justify-between">
                    <MemberChip member={from} currentUserId={currentUserId} />
                    <span className="mx-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-soft">
                      <ArrowRight className="h-4 w-4 text-muted" />
                    </span>
                    <MemberChip member={to} currentUserId={currentUserId} />
                  </div>
                  <p className="text-center text-sm font-semibold">
                    {memberListLabel(from, currentUserId)} should pay {memberListLabel(to, currentUserId)}
                  </p>
                  <p className="mb-3 mt-1.5 text-center text-[22px] font-extrabold tabular-nums">
                    {formatMinor(p.amountMinor, currency)}
                  </p>
                  {payAction ? payAction(p) : null}
                  {canSettle ? (
                    <button
                      type="button"
                      onClick={() => setPending(p)}
                      className="h-11 w-full cursor-pointer rounded-xl bg-primary text-[15px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      Mark as paid
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[18px] border border-border bg-surface p-3.5">
            <p className="font-bold text-success">Everyone is settled up</p>
            <p className="mt-1 text-[13px] text-muted">No payments left in this group.</p>
          </div>
        )}
      </div>

      <MemberLedgerSheet
        member={sheetMemberId ? memberById[sheetMemberId] || null : null}
        ledger={ledger}
        currency={currency}
        currentUserId={currentUserId}
        onClose={() => setSheetMemberId(null)}
      />

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setPending(null);
            setError("");
          }
        }}
        title="Mark as paid?"
        description={
          pending
            ? `This will record a transfer of ${formatMinor(pending.amountMinor, currency)} from ${memberListLabel(memberById[pending.from], currentUserId)} to ${memberListLabel(memberById[pending.to], currentUserId)}.${error ? ` ${error}` : ""}`
            : undefined
        }
        confirmLabel="Mark paid"
        cancelLabel="Cancel"
        tone="default"
        loading={saving}
        onConfirm={confirmPaid}
      />
    </div>
  );
}
