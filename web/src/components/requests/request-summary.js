"use client";

import { formatLongDate, formatMinor, memberName } from "@/lib/format";
import { getExpenseEmoji } from "@/lib/expense-icons";
import { suggestCategory } from "@/lib/expense-icons";
import { cn } from "@/lib/utils";

const STATUS = {
  PENDING: { label: "Waiting for approval", className: "bg-warning/15 text-warning" },
  APPROVED: { label: "Added", className: "bg-success/15 text-success" },
  REJECTED: { label: "Declined", className: "bg-danger/15 text-danger" },
};

export function RequestStatus({ status }) {
  const s = STATUS[status] || STATUS.PENDING;
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", s.className)}>{s.label}</span>;
}

/** Plain-English description of what a request would add to the ledger. */
export function describeRequest(request, byId, currency) {
  const p = request.payload || {};
  if (request.kind === "payment") {
    return {
      icon: "💸",
      title: `${memberName(byId[p.fromMemberId])} paid ${memberName(byId[p.toMemberId])}`,
      amount: formatMinor(p.amountMinor, currency),
      lines: [p.note ? `“${p.note}”` : null].filter(Boolean),
    };
  }
  const count = (p.splitMemberIds || []).length || 1;
  const each = Math.floor((p.amountMinor || 0) / count);
  return {
    icon: getExpenseEmoji(null, suggestCategory(p.title || "").key),
    title: p.title,
    amount: formatMinor(p.amountMinor, currency),
    lines: [
      `Paid by ${memberName(byId[p.paidByMemberId])} · ${formatLongDate(p.expenseDate)}`,
      `Split equally between ${count} ${count === 1 ? "person" : "people"} (about ${formatMinor(each, currency)} each)`,
      p.note ? `“${p.note}”` : null,
    ].filter(Boolean),
  };
}

export function RequestSummary({ request, byId, currency, showSubmitter = false, children }) {
  const d = describeRequest(request, byId, currency);
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft text-lg">{d.icon}</span>
        <div className="min-w-0 flex-1">
          {showSubmitter ? (
            <div className="mb-0.5 text-xs text-muted">
              <span className="font-bold text-foreground">{request.submitterName}</span>{" "}
              {request.kind === "payment" ? "says they paid" : "suggested an expense"} · {formatLongDate(request.createdAt)}
            </div>
          ) : null}
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 font-bold leading-5">{d.title}</span>
            <span className="shrink-0 font-bold tabular-nums">{d.amount}</span>
          </div>
          {d.lines.map((line) => (
            <div key={line} className="mt-0.5 text-xs text-muted">
              {line}
            </div>
          ))}
          {!showSubmitter ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <RequestStatus status={request.status} />
              {request.status === "REJECTED" && request.rejectReason ? (
                <span className="text-xs text-muted">Reason: {request.rejectReason}</span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}
