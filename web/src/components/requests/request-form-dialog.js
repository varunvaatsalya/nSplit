"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/user-avatar";
import { formatMinor, memberName } from "@/lib/format";
import { cn } from "@/lib/utils";

function toMinor(value) {
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
}

function todayValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function MemberPick({ members, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => {
        const on = value === m._id;
        return (
          <button
            key={m._id}
            type="button"
            onClick={() => onChange(m._id)}
            className={cn(
              "flex cursor-pointer items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-sm font-semibold transition-colors",
              on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface hover:bg-soft",
            )}
          >
            <UserAvatar className="h-6 w-6" fallbackClassName="text-[9px]" name={memberName(m)} avatar={m.avatar} seed={m._id} />
            {memberName(m)}
          </button>
        );
      })}
    </div>
  );
}

function Label({ children }) {
  return <div className="mb-1.5 mt-4 text-[11px] font-bold tracking-[0.06em] text-muted">{children}</div>;
}

/**
 * Viewer form on a share link: suggest an expense or report a payment. The group
 * reviews it before anything changes.
 */
export function RequestFormDialog({ open, onOpenChange, token, viewerKey, me, members, currency, preset, onSent }) {
  const [kind, setKind] = useState(preset?.kind || "expense");
  const [amount, setAmount] = useState(preset?.amountMinor ? String(preset.amountMinor / 100) : "");
  const [title, setTitle] = useState("");
  const [paidBy, setPaidBy] = useState(me._id);
  const [splitIds, setSplitIds] = useState(() => members.map((m) => m._id));
  const [date, setDate] = useState(todayValue);
  const [toId, setToId] = useState(preset?.toMemberId || members.find((m) => m._id !== me._id)?._id || "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const amountMinor = toMinor(amount);
  const others = members.filter((m) => m._id !== me._id);
  const each = splitIds.length ? Math.floor(amountMinor / splitIds.length) : 0;

  function toggleSplit(id) {
    setSplitIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (!amountMinor) return setError("Enter an amount.");
    if (kind === "expense" && !title.trim()) return setError("Add a title, e.g. “Dinner”.");
    if (kind === "expense" && !splitIds.length) return setError("Pick at least one person to split with.");
    if (kind === "payment" && !toId) return setError("Pick who you paid.");

    const [y, m, d] = date.split("-").map(Number);
    const body =
      kind === "expense"
        ? {
            kind,
            viewerKey,
            memberId: me._id,
            expense: {
              title: title.trim(),
              amountMinor,
              paidByMemberId: paidBy,
              splitMemberIds: splitIds,
              expenseDate: new Date(y, m - 1, d, 12).toISOString(),
              note: note.trim() || null,
            },
          }
        : {
            kind,
            viewerKey,
            memberId: me._id,
            payment: { fromMemberId: me._id, toMemberId: toId, amountMinor, note: note.trim() || null },
          };

    setSaving(true);
    try {
      const res = await fetch(`/api/share/${token}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message || "Could not send. Try again.");
        return;
      }
      setSent(true);
      onSent?.(json.data.request);
    } catch {
      setError("Could not send. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,720px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
          <DialogTitle>{sent ? "Request sent" : "Add to the ledger"}</DialogTitle>
          <DialogDescription>
            {sent ? "The group will review it." : "A group admin approves it before it shows up."}
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <Check className="h-7 w-7" />
            </span>
            <p className="mt-3 text-lg font-bold">Sent for approval</p>
            <p className="mt-1 max-w-xs text-sm text-muted">
              You can follow it under “Your requests”. It is added to the ledger once someone approves it.
            </p>
            <Button className="mt-6 w-full max-w-xs" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <div className="nsplit-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-3">
              <div className="inline-flex rounded-full bg-muted-foreground/10 p-1">
                {[
                  ["expense", "Expense"],
                  ["payment", "I've paid someone"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setKind(key)}
                    className={cn(
                      "cursor-pointer rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                      kind === key ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <Input
                inputMode="decimal"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
                className="mt-4 h-14 border bg-soft text-center text-3xl font-semibold shadow-none"
                autoFocus
              />

              {kind === "expense" ? (
                <>
                  <Label>WHAT WAS IT FOR</Label>
                  <Input placeholder="e.g. Dinner, Cab, Groceries" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />

                  <Label>PAID BY</Label>
                  <MemberPick members={members} value={paidBy} onChange={setPaidBy} />

                  <Label>SPLIT EQUALLY BETWEEN</Label>
                  <div className="flex flex-wrap gap-2">
                    {members.map((m) => {
                      const on = splitIds.includes(m._id);
                      return (
                        <button
                          key={m._id}
                          type="button"
                          onClick={() => toggleSplit(m._id)}
                          className={cn(
                            "flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-colors",
                            on ? "border-primary bg-soft" : "border-border bg-surface text-muted hover:bg-soft",
                          )}
                        >
                          {on ? <Check className="h-3.5 w-3.5 text-primary dark:text-primary-foreground" /> : null}
                          {memberName(m)}
                        </button>
                      );
                    })}
                  </div>
                  {amountMinor && splitIds.length ? (
                    <p className="mt-1.5 text-xs text-muted">About {formatMinor(each, currency)} each</p>
                  ) : null}

                  <Label>DATE</Label>
                  <Input type="date" value={date} max={todayValue()} onChange={(e) => setDate(e.target.value || todayValue())} />
                </>
              ) : (
                <>
                  <Label>WHO DID YOU PAY</Label>
                  <MemberPick members={others} value={toId} onChange={setToId} />
                  <p className="mt-2 text-xs text-muted">
                    Recorded as: {memberName(me)} paid {memberName(members.find((m) => m._id === toId))}
                    {amountMinor ? ` ${formatMinor(amountMinor, currency)}` : ""}.
                  </p>
                </>
              )}

              <Label>NOTE (OPTIONAL)</Label>
              <Textarea
                rows={2}
                placeholder={kind === "payment" ? "e.g. Paid via GPay" : "Anything the group should know"}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
              />
              {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
            </div>
            <div className="shrink-0 border-t border-border bg-surface p-4">
              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? "Sending…" : "Send for approval"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
