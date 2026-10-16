"use client";

import { formatLongDate, formatMinor, memberName } from "@/lib/format";
import { getExpenseEmoji } from "@/lib/expense-icons";
import { cn } from "@/lib/utils";

const STATUS = {
  PENDING: { label: "Waiting for approval", className: "bg-warning/15 text-warning" },
  APPROVED: { label: "Approved", className: "bg-success/15 text-success" },
  REJECTED: { label: "Declined", className: "bg-danger/15 text-danger" },
};

const SPLIT_LABELS = { EQUAL: "equally", EXACT: "by amount", SHARES: "by parts", PERCENTAGE: "by percent" };

export function RequestStatus({ status }) {
  const s = STATUS[status] || STATUS.PENDING;
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", s.className)}>{s.label}</span>;
}

function names(ids, byId) {
  const list = ids.map((id) => memberName(byId[id]));
  return list.length <= 3 ? list.join(", ") : `${list.slice(0, 3).join(", ")} +${list.length - 3}`;
}

/** Plain-English description of what a request asks for. */
export function describeRequest(request, byId, currency) {
  const p = request.payload || {};
  if (request.kind === "join") {
    return {
      icon: "🙋",
      title: `Join as ${request.submitterName}`,
      amount: null,
      lines: [`${request.requesterName || "Someone"} · ${request.requesterEmail || "no email"}`],
    };
  }
  if (request.kind === "payment") {
    return {
      icon: p.icon || "💸",
      title: p.title || `${memberName(byId[p.fromMemberId])} paid ${memberName(byId[p.toMemberId])}`,
      amount: formatMinor(p.amountMinor, currency),
      lines: [
        `${memberName(byId[p.fromMemberId])} → ${memberName(byId[p.toMemberId])}`,
        p.note ? `“${p.note}”` : null,
      ].filter(Boolean),
    };
  }
  const payers = (p.payers || []).map((x) => x.memberId);
  const split = (p.participants || []).filter((x) => x.included !== false).map((x) => x.memberId);
  return {
    icon: getExpenseEmoji(p.icon, p.categoryKey),
    title: p.title,
    amount: formatMinor(p.amountMinor, currency),
    lines: [
      `Paid by ${names(payers, byId)} · ${formatLongDate(p.expenseDate)}`,
      `Split ${SPLIT_LABELS[p.splitMethod] || ""} between ${names(split, byId)}`,
      p.description ? `“${p.description}”` : null,
    ].filter(Boolean),
  };
}

/** One request. Reviewers see who sent it; senders see its status. */
export function RequestSummary({ request, byId, currency, showSubmitter = false, children }) {
  const d = describeRequest(request, byId, currency);
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      {showSubmitter && request.kind !== "join" ? (
        <div className="mb-2 text-xs text-muted">
          <span className="font-bold text-foreground">{request.submitterName}</span>{" "}
          {request.kind === "payment" ? "recorded a payment" : "suggested an expense"} ·{" "}
          {formatLongDate(request.createdAt)}
          {request.requesterEmail ? <span className="block">{request.requesterEmail}</span> : null}
        </div>
      ) : null}
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-soft text-lg">{d.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="min-w-0 font-bold leading-5">{d.title}</span>
            {d.amount ? <span className="shrink-0 font-bold tabular-nums">{d.amount}</span> : null}
          </div>
          {d.lines.map((line) => (
            <div key={line} className="mt-0.5 break-words text-xs text-muted">
              {line}
            </div>
          ))}
          {!showSubmitter || request.status !== "PENDING" ? (
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
