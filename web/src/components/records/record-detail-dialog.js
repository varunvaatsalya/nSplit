"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { getExpenseEmoji } from "@/lib/expense-icons";
import { formatDetailWhen, formatMinor, formatSignedMinor, memberName, toneClass } from "@/lib/format";
import { memberListLabel, sortMembersByName } from "@/lib/members";
import { canMutateCreatedRecord } from "@/shared/permissions/index.js";
import { cn } from "@/lib/utils";

const SPLIT_LABELS = { EQUAL: "Equally", EXACT: "As amount", SHARES: "As parts", PERCENTAGE: "By percent" };

function SectionLabel({ children, className }) {
  return <div className={cn("mb-2 mt-4 text-[11px] font-bold tracking-[0.06em] text-muted", className)}>{children}</div>;
}

function PersonRow({ member, fallbackId, currentUserId, sub, right, rightClass }) {
  const name = memberListLabel(member || { displayName: "Member" }, currentUserId);
  return (
    <div className="flex items-center gap-2.5 py-1.5">
      <UserAvatar
        className="h-8 w-8"
        name={name}
        avatar={member?.avatar || member?.user?.avatar}
        seed={member?.userId || member?._id || fallbackId}
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{name}</div>
        {sub}
      </div>
      {right != null ? <div className={cn("shrink-0 font-semibold tabular-nums", rightClass)}>{right}</div> : null}
    </div>
  );
}

/** Small "Balance −₹26 → −₹37" line; the after amount is what the eye should land on. */
function BalanceLine({ line, currency }) {
  if (!line) return null;
  return (
    <div className="mt-px truncate text-xs text-muted">
      Balance {formatSignedMinor(line.beforeMinor, currency)} →{" "}
      <span className={cn("font-bold", toneClass(line.afterMinor))}>{formatSignedMinor(line.afterMinor, currency)}</span>
    </div>
  );
}

function Header({ icon, title, when, amount, kind, canEdit, onEdit, onDelete }) {
  return (
    <>
      <div className="flex items-start justify-between">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-soft text-[28px]">{icon}</span>
        {canEdit ? (
          <div className="flex gap-1">
            <button type="button" onClick={onEdit} className="cursor-pointer rounded-lg p-2 hover:bg-soft" aria-label="Edit">
              <Pencil className="h-4.5 w-4.5" />
            </button>
            <button type="button" onClick={onDelete} className="cursor-pointer rounded-lg p-2 text-danger hover:bg-soft" aria-label="Delete">
              <Trash2 className="h-4.5 w-4.5" />
            </button>
          </div>
        ) : null}
      </div>
      <h2 className="mt-3 text-[22px] font-bold leading-tight">{title}</h2>
      <p className="mt-1 text-muted">{when}</p>
      <div className="mb-4 mt-2.5 flex items-center justify-between gap-3">
        <span className="text-[32px] font-bold tabular-nums">{amount}</span>
        <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
          {kind}
        </span>
      </div>
    </>
  );
}

function ExpenseBody({ expense, members, byId, currency, currentUserId, ledger }) {
  const payers = expense.payers || [];
  const splits = (expense.splits || []).filter((s) => (s.amountMinor || 0) > 0);
  const lines = ledger?.byRecordId[`expense:${expense._id}`]?.lines || {};
  const splitIds = new Set(splits.map((s) => s.memberId));
  const myMemberId = members.find((m) => m.userId && String(m.userId) === String(currentUserId))?._id;

  return (
    <>
      <SectionLabel>PAID BY</SectionLabel>
      {payers.map((p) => (
        <PersonRow
          key={p.memberId}
          member={byId[p.memberId]}
          fallbackId={p.memberId}
          currentUserId={currentUserId}
          right={formatMinor(p.amountMinor, currency)}
          sub={
            <>
              <div className="text-xs text-muted">{payers.length === 1 ? "Paid full amount" : "Paid part"}</div>
              {splitIds.has(p.memberId) ? null : <BalanceLine line={lines[p.memberId]} currency={currency} />}
            </>
          }
        />
      ))}

      <div className="mb-2 mt-4 flex items-center justify-between">
        <span className="text-[11px] font-bold tracking-[0.06em] text-muted">SPLIT WITH ({splits.length})</span>
        <span className="text-[11px] font-bold text-muted">{SPLIT_LABELS[expense.splitMethod] || expense.splitMethod}</span>
      </div>
      {splits.map((s) => (
        <PersonRow
          key={s.memberId}
          member={byId[s.memberId]}
          fallbackId={s.memberId}
          currentUserId={currentUserId}
          right={formatMinor(s.amountMinor, currency)}
          rightClass={s.memberId === myMemberId ? "text-primary dark:text-primary-foreground" : undefined}
          sub={<BalanceLine line={lines[s.memberId]} currency={currency} />}
        />
      ))}

      {expense.description ? (
        <>
          <SectionLabel>DESCRIPTION</SectionLabel>
          <p className="whitespace-pre-wrap leading-5">{expense.description}</p>
        </>
      ) : null}
    </>
  );
}

function TransferBody({ transfer, byId, currency, currentUserId, ledger }) {
  const lines = ledger?.byRecordId[`transfer:${transfer._id}`]?.lines || {};
  return (
    <>
      <SectionLabel>FROM</SectionLabel>
      <PersonRow
        member={byId[transfer.fromMemberId]}
        fallbackId={transfer.fromMemberId}
        currentUserId={currentUserId}
        right={formatMinor(transfer.amountMinor, currency)}
        sub={<BalanceLine line={lines[transfer.fromMemberId]} currency={currency} />}
      />
      <SectionLabel>TRANSFERRED TO</SectionLabel>
      <PersonRow
        member={byId[transfer.toMemberId]}
        fallbackId={transfer.toMemberId}
        currentUserId={currentUserId}
        right={formatMinor(transfer.amountMinor, currency)}
        sub={<BalanceLine line={lines[transfer.toMemberId]} currency={currency} />}
      />
    </>
  );
}

/**
 * Full detail for an expense or a transfer with prev/next through the feed
 * (same pages as the app), including each member's balance before → after.
 */
export function RecordDetailDialog({
  open,
  onOpenChange,
  items = [],
  index = 0,
  onIndexChange,
  group,
  ledger,
  currentUserId,
  onEditExpense,
  onEditTransfer,
  onDeleted,
}) {
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const item = items[index] || null;
  const members = useMemo(() => sortMembersByName(group?.members || []), [group?.members]);
  const byId = useMemo(() => Object.fromEntries(members.map((m) => [m._id, m])), [members]);
  const me = members.find((m) => m.userId && String(m.userId) === String(currentUserId));
  const record = item ? (item.kind === "expense" ? item.expense : item.transfer) : null;
  const currency = record?.currency || group?.currency || "INR";
  const creator = record?.createdById
    ? members.find((m) => m.userId && String(m.userId) === String(record.createdById))
    : null;
  const canEdit = Boolean(record && canMutateCreatedRecord(me?.permission, record.createdById, currentUserId));
  const canPrev = index > 0;
  const canNext = index < items.length - 1;

  useEffect(() => {
    if (!open || items.length <= 1) return;
    function onKeyDown(e) {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target?.isContentEditable) return;
      const next = index + (e.key === "ArrowLeft" ? -1 : 1);
      if (next < 0 || next >= items.length) return;
      e.preventDefault();
      onIndexChange?.(next);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, index, items.length, onIndexChange]);

  async function confirmDelete() {
    if (!record || deleting || !canEdit) return;
    setDeleting(true);
    try {
      const path = item.kind === "expense" ? "expenses" : "transfers";
      const res = await fetch(`/api/groups/${group.code}/${path}/${record._id}`, { method: "DELETE" });
      if (!res.ok) return;
      setConfirmOpen(false);
      onDeleted?.();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(90vh,760px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogTitle className="sr-only">{record?.title || "Record"}</DialogTitle>
          <DialogDescription className="sr-only">Record details</DialogDescription>
          {record ? (
            <div className="nsplit-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-5">
              <Header
                icon={item.kind === "expense" ? getExpenseEmoji(record.icon, record.categoryKey) : record.icon || "💸"}
                title={record.title || (item.kind === "expense" ? "Expense" : "Transfer")}
                when={formatDetailWhen(record.expenseDate || record.transferDate || record.createdAt)}
                amount={formatMinor(record.amountMinor, currency)}
                kind={item.kind === "expense" ? "Expense" : "Transfer"}
                canEdit={canEdit}
                onEdit={() => (item.kind === "expense" ? onEditExpense?.(record) : onEditTransfer?.(record))}
                onDelete={() => setConfirmOpen(true)}
              />
              {item.kind === "expense" ? (
                <ExpenseBody
                  expense={record}
                  members={members}
                  byId={byId}
                  currency={currency}
                  currentUserId={currentUserId}
                  ledger={ledger}
                />
              ) : (
                <TransferBody transfer={record} byId={byId} currency={currency} currentUserId={currentUserId} ledger={ledger} />
              )}
              <div className="mt-5 flex items-center gap-1.5 border-t border-border pt-3 text-xs text-muted">
                <span>Added on</span>
                <span className="truncate">{formatDetailWhen(record.createdAt)}</span>
                {creator ? <span className="truncate">· by {memberName(creator)}</span> : null}
              </div>
            </div>
          ) : null}
          {items.length > 1 ? (
            <div className="flex shrink-0 items-center justify-between border-t border-border px-3 py-2">
              <button
                type="button"
                disabled={!canPrev}
                onClick={() => onIndexChange?.(index - 1)}
                className="cursor-pointer rounded-lg p-1.5 hover:bg-soft disabled:cursor-default disabled:opacity-30"
                aria-label="Newer record"
              >
                <ChevronLeft className="h-7 w-7" />
              </button>
              <span className="text-xs text-muted tabular-nums">
                {index + 1} / {items.length}
              </span>
              <button
                type="button"
                disabled={!canNext}
                onClick={() => onIndexChange?.(index + 1)}
                className="cursor-pointer rounded-lg p-1.5 hover:bg-soft disabled:cursor-default disabled:opacity-30"
                aria-label="Older record"
              >
                <ChevronRight className="h-7 w-7" />
              </button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={item?.kind === "transfer" ? "Delete transfer?" : "Delete expense?"}
        description={record ? `“${record.title || "This record"}” will be removed from this group. This cannot be undone.` : undefined}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        tone="danger"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </>
  );
}
