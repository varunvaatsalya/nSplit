"use client";

import { useEffect, useState } from "react";
import { CalendarDays, ChevronDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EmojiPicker } from "@/components/emoji-picker";
import { suggestEmojiFromText } from "@/lib/emoji-icons";
import { cn } from "@/lib/utils";

const DEFAULT_TRANSFER_EMOJI = "💸";

function memberLabel(m) {
  return m.displayName || m.user?.name || "Member";
}

function toLocalDateValue(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toLocalTimeValue(date) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function combineDateTime(dateStr, timeStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

function formatWhenLabel(date) {
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (sameDay) return `Today · ${time}`;
  return `${date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })} · ${time}`;
}

/**
 * Transfer create UI - embed inside Add Record, or standalone.
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

  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState(DEFAULT_TRANSFER_EMOJI);
  const [iconManual, setIconManual] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [fromMemberId, setFromMemberId] = useState("");
  const [toMemberId, setToMemberId] = useState("");
  const [transferAt, setTransferAt] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({
    amount: false,
    title: false,
    from: false,
    to: false,
  });
  const [shakeKey, setShakeKey] = useState(0);

  const [whenOpen, setWhenOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");
  const [timeOpen, setTimeOpen] = useState(false);

  function applyTitleSuggestion(nextTitle) {
    if (iconManual) return;
    setIcon(
      suggestEmojiFromText(nextTitle, {
        emoji: DEFAULT_TRANSFER_EMOJI,
        label: "Transfer",
      }).emoji,
    );
  }

  function pickIcon(item) {
    setIcon(item.emoji);
    setIconManual(true);
  }

  function resetForm() {
    setTitle("");
    setIcon(DEFAULT_TRANSFER_EMOJI);
    setIconManual(false);
    setAmount("");
    setTransferAt(new Date());
    setFieldErrors({ amount: false, title: false, from: false, to: false });
    const first = members[0]?._id || "";
    setFromMemberId(first);
    setToMemberId("");
  }

  useEffect(() => {
    if (!active || !members.length) return;
    resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, group?._id]);

  function openWhenModal() {
    setDraftDate(toLocalDateValue(transferAt));
    setDraftTime(toLocalTimeValue(transferAt));
    setTimeOpen(false);
    setWhenOpen(true);
  }

  function saveWhen() {
    setTransferAt(combineDateTime(draftDate, draftTime));
    setWhenOpen(false);
  }

  async function onSubmit(e) {
    e.preventDefault();
    const n = Number(amount);
    const amountOk = Number.isFinite(n) && n > 0;
    const titleOk = Boolean(title.trim());
    const fromOk = Boolean(fromMemberId);
    const toOk = Boolean(toMemberId) && fromMemberId !== toMemberId;

    if (!amountOk || !titleOk || !fromOk || !toOk) {
      setFieldErrors({
        amount: !amountOk,
        title: !titleOk,
        from: !fromOk,
        to: !toOk,
      });
      setShakeKey((k) => k + 1);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/groups/${group.code}/transfers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          icon,
          amountMinor: Math.round(n * 100),
          fromMemberId,
          toMemberId,
          transferDate: transferAt.toISOString(),
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

  const fromMember = members.find((m) => m._id === fromMemberId);
  const toOptions = members.filter((m) => m._id !== fromMemberId);

  return (
    <>
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
                  "border-danger focus-visible:ring-danger animate-nsplit-shake",
              )}
            />
          </div>
          <div key={`title-${shakeKey}`} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIconsOpen(true)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-soft text-xl hover:bg-background"
              aria-label="Choose transfer icon"
              title="Choose icon"
            >
              {icon}
            </button>
            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => {
                const next = e.target.value;
                setTitle(next);
                setFieldErrors((prev) => ({ ...prev, title: false }));
                applyTitleSuggestion(next);
              }}
              className={cn(
                "flex-1",
                fieldErrors.title &&
                  "border-danger focus-visible:ring-danger animate-nsplit-shake",
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div key={`from-${shakeKey}`}>
              <Select
                value={fromMemberId || undefined}
                onValueChange={(v) => {
                  setFromMemberId(v);
                  setFieldErrors((prev) => ({
                    ...prev,
                    from: false,
                    to: false,
                  }));
                  if (toMemberId === v) setToMemberId("");
                }}
              >
                <SelectTrigger
                  className={cn(
                    "h-auto min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm",
                    fieldErrors.from &&
                      "border-danger focus:ring-danger animate-nsplit-shake",
                  )}
                >
                  <User className="h-4 w-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate text-left">
                    <span className="block text-[10px] tracking-wide text-muted">
                      From
                    </span>
                    <span className="font-medium">
                      {fromMember ? memberLabel(fromMember) : "Select"}
                    </span>
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m._id} value={m._id}>
                      {memberLabel(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <button
              type="button"
              onClick={openWhenModal}
              className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm hover:bg-soft"
            >
              <CalendarDays className="h-4 w-4 text-muted" />
              <span className="min-w-0 flex-1 truncate">
                <span className="block text-[10px] tracking-wide text-muted">
                  When
                </span>
                <span className="font-medium">
                  {formatWhenLabel(transferAt)}
                </span>
              </span>
            </button>
          </div>

          <div key={`to-${shakeKey}`} className="space-y-1.5">
            <span className="text-xs font-medium text-muted">
              Transferred to
            </span>
            <Select
              value={toMemberId || undefined}
              onValueChange={(v) => {
                setToMemberId(v);
                setFieldErrors((prev) => ({ ...prev, from: false, to: false }));
              }}
            >
              <SelectTrigger
                className={cn(
                  "h-11 text-sm",
                  fieldErrors.to &&
                    "border-danger focus:ring-danger animate-nsplit-shake",
                )}
              >
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                {toOptions.map((m) => (
                  <SelectItem key={m._id} value={m._id}>
                    {memberLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-surface p-4">
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? "Saving…" : "Record transfer"}
          </Button>
        </div>
      </form>

      <EmojiPicker
        open={iconsOpen}
        onOpenChange={setIconsOpen}
        value={icon}
        onSelect={pickIcon}
        description="Tap an emoji for this transfer."
      />

      <Dialog open={whenOpen} onOpenChange={setWhenOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>When</DialogTitle>
            <DialogDescription>
              Pick a date. Time stays on now unless you change it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              type="date"
              value={draftDate}
              onChange={(e) => setDraftDate(e.target.value)}
            />

            <Collapsible open={timeOpen} onOpenChange={setTimeOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  <span className="text-muted">Time</span>
                  <span className="flex items-center gap-1 font-medium">
                    {draftTime
                      ? new Date(`1970-01-01T${draftTime}`).toLocaleTimeString(
                          undefined,
                          { hour: "numeric", minute: "2-digit" },
                        )
                      : "-"}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted transition-transform",
                        timeOpen && "rotate-180",
                      )}
                    />
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <Input
                  type="time"
                  value={draftTime}
                  onChange={(e) => setDraftTime(e.target.value)}
                />
              </CollapsibleContent>
            </Collapsible>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                const now = new Date();
                setDraftDate(toLocalDateValue(now));
                setDraftTime(toLocalTimeValue(now));
              }}
            >
              Now
            </Button>
            <Button type="button" onClick={saveWhen}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
