"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";
import { getExpenseEmoji } from "@/lib/expense-icons";
import { dateHeaderLabel, formatMinor, formatSignedMinor, memberName, toneClass } from "@/lib/format";
import { memberListLabel } from "@/lib/members";
import { memberTotals } from "@/shared/ledger/index.js";
import { cn } from "@/lib/utils";

function Stat({ label, value }) {
  return (
    <div className="px-3.5 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-0.5 text-[15px] font-bold tabular-nums">{value}</div>
    </div>
  );
}

/** One member's balance sheet: totals plus every record that moved their balance. */
export function MemberLedgerSheet({ member, ledger, currency, currentUserId, onClose }) {
  const memberId = member?._id;
  const rows = useMemo(
    () => (memberId ? ledger.entries.filter((e) => e.lines[memberId]).reverse() : []),
    [ledger, memberId],
  );
  const totals = useMemo(() => (memberId ? memberTotals(ledger, memberId) : null), [ledger, memberId]);
  const net = rows[0] && memberId ? rows[0].lines[memberId].afterMinor : 0;

  return (
    <Dialog open={Boolean(member)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[min(90vh,760px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
          <DialogTitle>Balance sheet</DialogTitle>
          <DialogDescription className="sr-only">Everything that moved this member&apos;s balance.</DialogDescription>
        </DialogHeader>

        {member && totals ? (
          <div className="nsplit-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-8 pt-4">
            <div className="mb-5 flex flex-col items-center text-center">
              <UserAvatar
                className="h-14 w-14"
                name={memberName(member)}
                avatar={member.avatar || member.user?.avatar}
                seed={member.userId || member._id}
              />
              <div className="mt-2.5 max-w-full truncate text-lg font-bold">{memberListLabel(member, currentUserId)}</div>
              <div className={cn("mt-1.5 text-[28px] font-extrabold tabular-nums", toneClass(net))}>
                {formatSignedMinor(net, currency)}
              </div>
              <div className={cn("text-[13px] font-semibold", toneClass(net))}>
                {net > 0 ? "Gets back" : net < 0 ? "Needs to pay" : "Settled up"}
              </div>
            </div>

            <div className="grid grid-cols-2 rounded-2xl border border-border bg-surface py-1.5">
              <Stat label="Paid for expenses" value={formatMinor(totals.paidMinor, currency)} />
              <Stat label="Their share" value={formatMinor(totals.shareMinor, currency)} />
              <Stat label="Payments sent" value={formatMinor(totals.sentMinor, currency)} />
              <Stat label="Payments received" value={formatMinor(totals.receivedMinor, currency)} />
            </div>
            <p className="mt-2 text-center text-[11px] text-muted">Balance = paid − share + sent − received</p>

            <div className="mb-2 mt-5 text-[11px] font-bold tracking-[0.06em] text-muted">HISTORY ({rows.length})</div>
            {rows.length ? (
              <ul className="space-y-2">
                {rows.map((entry) => {
                  const line = entry.lines[member._id];
                  const isTransfer = entry.kind === "transfer";
                  const detail = isTransfer
                    ? line.paidMinor
                      ? `Sent ${formatMinor(line.paidMinor, currency)}`
                      : `Received ${formatMinor(line.shareMinor, currency)}`
                    : [
                        line.paidMinor ? `Paid ${formatMinor(line.paidMinor, currency)}` : null,
                        line.shareMinor ? `Share ${formatMinor(line.shareMinor, currency)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                  return (
                    <li
                      key={`${entry.kind}-${entry.id}`}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft text-lg">
                        {isTransfer ? entry.icon || "💸" : getExpenseEmoji(entry.icon, entry.categoryKey)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-bold">{entry.title}</div>
                        <div className="mt-0.5 truncate text-xs text-muted">{dateHeaderLabel(entry.date)}</div>
                        <div className="mt-0.5 truncate text-xs text-muted">{detail}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={cn("font-extrabold tabular-nums", toneClass(line.deltaMinor))}>
                          {formatSignedMinor(line.deltaMinor, currency)}
                        </div>
                        <div className="mt-1 text-[11px] text-muted">Balance</div>
                        <div className={cn("text-xs font-bold tabular-nums", toneClass(line.afterMinor))}>
                          {formatSignedMinor(line.afterMinor, currency)}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-3 text-center text-sm text-muted">No expenses or payments yet.</p>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
