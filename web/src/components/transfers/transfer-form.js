"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

function memberLabel(m) {
  return m.displayName || m.user?.name || "Member";
}

/**
 * Transfer create UI — embed inside Add Record, or standalone.
 */
export function TransferForm({
  group,
  onCreated,
  onClose,
  embedded = false,
  active = false,
}) {
  const members = group?.members || [];
  const currency = group?.currency || "INR";

  const [amount, setAmount] = useState("");
  const [fromMemberId, setFromMemberId] = useState("");
  const [toMemberId, setToMemberId] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    amount: false,
    from: false,
    to: false,
  });
  const [shakeKey, setShakeKey] = useState(0);

  function resetForm() {
    setAmount("");
    setNote("");
    setFieldErrors({ amount: false, from: false, to: false });
    const first = members[0]?.id || "";
    const second = members[1]?.id || members[0]?.id || "";
    setFromMemberId(first);
    setToMemberId(second);
  }

  useEffect(() => {
    if (!active || !members.length) return;
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, group?.id]);

  async function onSubmit(e) {
    e.preventDefault();
    const n = Number(amount);
    const amountOk = Number.isFinite(n) && n > 0;
    const fromOk = Boolean(fromMemberId);
    const toOk = Boolean(toMemberId) && fromMemberId !== toMemberId;

    if (!amountOk || !fromOk || !toOk) {
      setFieldErrors({
        amount: !amountOk,
        from: !fromOk || fromMemberId === toMemberId,
        to: !toOk,
      });
      setShakeKey((k) => k + 1);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${group.id}/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountMinor: Math.round(n * 100),
          fromMemberId,
          toMemberId,
          note: note.trim() || null,
          currency,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setShakeKey((k) => k + 1);
        return;
      }
      onClose?.();
      onCreated?.(json.data?.transfer);
    } catch {
      setShakeKey((k) => k + 1);
    } finally {
      setSaving(false);
    }
  }

  if (!group) return null;

  return (
    <form
      onSubmit={onSubmit}
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className="nsplit-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-3">
        <div key={`amount-${shakeKey}`}>
          <Input
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setFieldErrors((prev) => ({ ...prev, amount: false }));
            }}
            className={cn(
              "h-14 border bg-soft text-center text-3xl font-semibold tracking-tight shadow-none focus-visible:ring-1",
              fieldErrors.amount &&
                "border-danger focus-visible:ring-danger animate-nsplit-shake"
            )}
          />
        </div>

        <div key={`from-${shakeKey}`} className="space-y-1.5">
          <span className="text-xs font-medium text-muted">From</span>
          <Select
            value={fromMemberId}
            onValueChange={(v) => {
              setFromMemberId(v);
              setFieldErrors((prev) => ({ ...prev, from: false, to: false }));
            }}
          >
            <SelectTrigger
              className={cn(
                fieldErrors.from &&
                  "border-danger focus:ring-danger animate-nsplit-shake"
              )}
            >
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {memberLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div key={`to-${shakeKey}`} className="space-y-1.5">
          <span className="text-xs font-medium text-muted">To</span>
          <Select
            value={toMemberId}
            onValueChange={(v) => {
              setToMemberId(v);
              setFieldErrors((prev) => ({ ...prev, from: false, to: false }));
            }}
          >
            <SelectTrigger
              className={cn(
                fieldErrors.to &&
                  "border-danger focus:ring-danger animate-nsplit-shake"
              )}
            >
              <SelectValue placeholder="Select member" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {memberLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted">Note</span>
          <Input
            placeholder="Optional"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-surface p-4">
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving…" : "Record transfer"}
        </Button>
      </div>
    </form>
  );
}
