"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronDown, Minus, Plus, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { calculateSplit } from "@/shared/split/index.js";
import { suggestCategoryFromTitle } from "@/shared/categories/index.js";
import {
  EXPENSE_ICON_SECTIONS,
  categoryKeyForEmoji,
  getExpenseEmoji,
} from "@/lib/expense-icons";
import { cn } from "@/lib/utils";

const SPLIT_METHODS = [
  { value: "EQUAL", label: "Equally" },
  { value: "EXACT", label: "As amount" },
  { value: "SHARES", label: "As parts" },
];

const EMPTY_FIELD_ERRORS = {
  amount: false,
  title: false,
  paidBy: false,
  exactIds: [],
  payerIds: [],
};

function normalizeSplitMethod(value) {
  return ["EQUAL", "EXACT", "SHARES"].includes(value) ? value : "EQUAL";
}

function defaultParts(memberIds) {
  const map = {};
  for (const id of memberIds) map[id] = 1;
  return map;
}

/** Apply group default split method + shares config onto member ids. */
function resolveGroupSplitDefaults(group, memberIds) {
  const method = normalizeSplitMethod(group?.settings?.defaultSplitMethod);
  const parts = defaultParts(memberIds);
  if (method === "SHARES") {
    const config = group?.settings?.defaultSplitConfig;
    if (Array.isArray(config)) {
      const idSet = new Set(memberIds.map(String));
      for (const row of config) {
        const mid = row?.memberId != null ? String(row.memberId) : "";
        if (!mid || !idSet.has(mid)) continue;
        const n = Number(row.value);
        parts[mid] =
          Number.isFinite(n) && n >= 1 ? Math.min(99, Math.round(n)) : 1;
      }
    }
  }
  return { method, parts };
}

function formatMinor(minor, currency = "INR") {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format((minor || 0) / 100);
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

function memberLabel(m) {
  return m.displayName || m.user?.name || "Member";
}

function distributePayerAmounts(totalMinor, payerIds) {
  if (!payerIds.length) return {};
  const base = Math.floor(totalMinor / payerIds.length);
  let rem = totalMinor - base * payerIds.length;
  const sorted = [...payerIds].sort();
  const map = {};
  for (const id of sorted) {
    const extra = rem > 0 ? 1 : 0;
    if (rem > 0) rem -= 1;
    map[id] = base + extra;
  }
  return map;
}

/**
 * Expense create/edit UI - modal by default, or embed inside Add Record.
 */
export function ExpenseForm({
  group,
  onCreated,
  onUpdated,
  triggerLabel = "Add expense",
  embedded = false,
  active = false,
  onClose,
  expense = null,
}) {
  const isEdit = Boolean(expense?.id);
  const members = group?.members || [];
  const currency = group?.currency || "INR";
  const defaultPayer =
    members.find((m) => m.permission === "ADMIN") || members[0] || null;

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [categoryKey, setCategoryKey] = useState("other");
  const [icon, setIcon] = useState(() => getExpenseEmoji(null, "other"));
  const [iconManual, setIconManual] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [description, setDescription] = useState("");
  const [splitMethod, setSplitMethod] = useState(() =>
    normalizeSplitMethod(group?.settings?.defaultSplitMethod)
  );
  const [includedIds, setIncludedIds] = useState([]);
  const [exactInputs, setExactInputs] = useState({});
  const [partInputs, setPartInputs] = useState({});
  const [payerIds, setPayerIds] = useState([]);
  const [payerAmounts, setPayerAmounts] = useState({});
  const [expenseAt, setExpenseAt] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(EMPTY_FIELD_ERRORS);
  const [shakeKey, setShakeKey] = useState(0);

  const [payersOpen, setPayersOpen] = useState(false);
  const [whenOpen, setWhenOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");
  const [timeOpen, setTimeOpen] = useState(false);
  const [draftPayerIds, setDraftPayerIds] = useState([]);
  const [draftPayerAmounts, setDraftPayerAmounts] = useState({});
  const [payerFieldErrors, setPayerFieldErrors] = useState([]);
  const [payerShakeKey, setPayerShakeKey] = useState(0);

  function applyTitleSuggestion(nextTitle, { force = false } = {}) {
    if (iconManual && !force) return;
    const suggested = suggestCategoryFromTitle(nextTitle);
    setCategoryKey(suggested.key);
    setIcon(suggested.emoji);
  }

  function pickIcon(emoji, nextCategoryKey) {
    setIcon(emoji);
    setCategoryKey(nextCategoryKey || categoryKeyForEmoji(emoji));
    setIconManual(true);
    setIconsOpen(false);
  }

  function bumpShake() {
    setShakeKey((k) => k + 1);
  }

  function bumpPayerShake() {
    setPayerShakeKey((k) => k + 1);
  }

  function resetForm() {
    const ids = members.map((m) => m.id);
    setAmount("");
    setTitle("");
    setDescription("");
    setShowDesc(false);
    const fallback = suggestCategoryFromTitle("");
    setCategoryKey(fallback.key);
    setIcon(fallback.emoji);
    setIconManual(false);
    setExactInputs({});
    const { method, parts } = resolveGroupSplitDefaults(group, ids);
    setSplitMethod(method);
    setPartInputs(parts);
    setExpenseAt(new Date());
    setIncludedIds(ids);
    setFieldErrors(EMPTY_FIELD_ERRORS);
    if (defaultPayer) {
      setPayerIds([defaultPayer.id]);
      setPayerAmounts({});
    } else {
      setPayerIds([]);
      setPayerAmounts({});
    }
  }

  function hydrateFromExpense(exp) {
    const memberIds = new Set(members.map((m) => m.id));
    const amountMajor = ((exp.amountMinor || 0) / 100).toString();
    setAmount(amountMajor);
    setTitle(exp.title || "");
    const desc = exp.description || "";
    setDescription(desc);
    setShowDesc(Boolean(desc));
    setCategoryKey(exp.categoryKey || "other");
    setIcon(getExpenseEmoji(exp.icon, exp.categoryKey || "other"));
    setIconManual(Boolean(exp.icon));
    const method = normalizeSplitMethod(exp.splitMethod);
    setSplitMethod(method);

    const included = (exp.participants || [])
      .filter((p) => p.included !== false && memberIds.has(String(p.memberId)))
      .map((p) => String(p.memberId));
    const fallbackIncluded = (exp.splits || [])
      .filter(
        (s) => (s.amountMinor || 0) > 0 && memberIds.has(String(s.memberId))
      )
      .map((s) => String(s.memberId));
    const nextIncluded = included.length ? included : fallbackIncluded;
    setIncludedIds(nextIncluded.length ? nextIncluded : members.map((m) => m.id));

    const exact = {};
    const { parts: defaultShareParts } = resolveGroupSplitDefaults(
      { settings: { defaultSplitMethod: "SHARES", defaultSplitConfig: group?.settings?.defaultSplitConfig } },
      members.map((m) => m.id)
    );
    const parts = { ...defaultShareParts };
    for (const s of exp.splits || []) {
      const mid = String(s.memberId);
      if (!memberIds.has(mid)) continue;
      if (method === "EXACT") {
        exact[mid] = ((s.amountMinor || 0) / 100).toString();
      }
      if (method === "SHARES") {
        const n = Number(s.inputValue);
        if (Number.isFinite(n) && n >= 1) {
          parts[mid] = Math.min(99, Math.round(n));
        }
      }
    }
    setExactInputs(exact);
    setPartInputs(parts);

    const payers = (exp.payers || []).filter((p) =>
      memberIds.has(String(p.memberId))
    );
    if (payers.length) {
      setPayerIds(payers.map((p) => String(p.memberId)));
      const amounts = {};
      for (const p of payers) amounts[String(p.memberId)] = p.amountMinor || 0;
      setPayerAmounts(amounts);
    } else if (defaultPayer) {
      setPayerIds([defaultPayer.id]);
      setPayerAmounts({});
    } else {
      setPayerIds([]);
      setPayerAmounts({});
    }

    const when = exp.expenseDate || exp.createdAt;
    setExpenseAt(when ? new Date(when) : new Date());
    setFieldErrors(EMPTY_FIELD_ERRORS);
  }

  const defaultSplitMethod = normalizeSplitMethod(
    group?.settings?.defaultSplitMethod
  );
  const defaultSplitConfigKey = JSON.stringify(
    group?.settings?.defaultSplitConfig ?? null
  );

  useEffect(() => {
    const isActive = embedded ? active : open;
    if (!isActive || !members.length) return;
    if (expense?.id) hydrateFromExpense(expense);
    else resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    embedded,
    active,
    open,
    group?.id,
    expense?.id,
    defaultSplitMethod,
    defaultSplitConfigKey,
    members.length,
  ]);

  const amountMinor = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100);
  }, [amount]);

  const resolvedPayerAmounts = useMemo(() => {
    if (!payerIds.length) return {};
    if (payerIds.length === 1) {
      return { [payerIds[0]]: amountMinor };
    }
    const hasManual = payerIds.every((id) => Number.isInteger(payerAmounts[id]));
    if (hasManual) return payerAmounts;
    return distributePayerAmounts(amountMinor, payerIds);
  }, [amountMinor, payerIds, payerAmounts]);

  const payerSum = useMemo(
    () => payerIds.reduce((s, id) => s + (resolvedPayerAmounts[id] || 0), 0),
    [payerIds, resolvedPayerAmounts]
  );

  const splitPreview = useMemo(() => {
    if (!amountMinor || !includedIds.length) {
      return { valid: true, splits: [], errors: [] };
    }
    const participants = includedIds.map((memberId) => {
      if (splitMethod === "EQUAL") return { memberId };
      if (splitMethod === "SHARES") {
        const parts = Number(partInputs[memberId] ?? 1);
        return {
          memberId,
          inputValue: Number.isFinite(parts) && parts > 0 ? parts : 0,
        };
      }
      const major = exactInputs[memberId];
      const n = major === "" || major == null ? 0 : Number(major);
      return {
        memberId,
        inputValue: Number.isFinite(n) ? Math.round(n * 100) : 0,
      };
    });
    return calculateSplit({
      method: splitMethod,
      totalMinor: amountMinor,
      participants,
    });
  }, [amountMinor, includedIds, splitMethod, exactInputs, partInputs]);

  const splitByMember = useMemo(() => {
    const map = {};
    for (const s of splitPreview.splits || []) map[s.memberId] = s.amountMinor;
    return map;
  }, [splitPreview]);

  const draftPayerSum = useMemo(
    () =>
      draftPayerIds.reduce((s, id) => {
        if (draftPayerIds.length === 1) return amountMinor;
        return s + (draftPayerAmounts[id] || 0);
      }, 0),
    [draftPayerIds, draftPayerAmounts, amountMinor]
  );

  const payerSummary = useMemo(() => {
    if (!payerIds.length) return "Select payer";
    if (payerIds.length === 1) {
      const m = members.find((x) => x.id === payerIds[0]);
      return m ? memberLabel(m) : "1 payer";
    }
    return `${payerIds.length} people paid`;
  }, [payerIds, members]);

  function openPayersModal() {
    setDraftPayerIds(
      payerIds.length ? payerIds : defaultPayer ? [defaultPayer.id] : []
    );
    setDraftPayerAmounts({ ...resolvedPayerAmounts });
    setPayerFieldErrors([]);
    setPayersOpen(true);
  }

  function toggleDraftPayer(memberId) {
    setDraftPayerIds((prev) => {
      const next = prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId];
      setDraftPayerAmounts(distributePayerAmounts(amountMinor, next));
      return next;
    });
    setPayerFieldErrors([]);
  }

  function savePayers() {
    if (!draftPayerIds.length) {
      setPayerFieldErrors([]);
      bumpPayerShake();
      return;
    }
    const unbalanced =
      draftPayerIds.length > 1 &&
      amountMinor > 0 &&
      draftPayerSum !== amountMinor;
    if (unbalanced) {
      setPayerFieldErrors(draftPayerIds);
      bumpPayerShake();
      return;
    }
    const amounts =
      draftPayerIds.length === 1
        ? { [draftPayerIds[0]]: amountMinor }
        : draftPayerAmounts;
    setPayerIds(draftPayerIds);
    setPayerAmounts(amounts);
    setFieldErrors((prev) => ({ ...prev, paidBy: false }));
    setPayerFieldErrors([]);
    setPayersOpen(false);
  }

  function openWhenModal() {
    setDraftDate(toLocalDateValue(expenseAt));
    setDraftTime(toLocalTimeValue(expenseAt));
    setTimeOpen(false);
    setWhenOpen(true);
  }

  function saveWhen() {
    setExpenseAt(combineDateTime(draftDate, draftTime));
    setWhenOpen(false);
  }

  function toggleIncluded(memberId) {
    setIncludedIds((prev) => {
      if (prev.includes(memberId)) {
        if (prev.length === 1) return prev;
        return prev.filter((id) => id !== memberId);
      }
      setPartInputs((p) => ({ ...p, [memberId]: p[memberId] || 1 }));
      return [...prev, memberId];
    });
  }

  function setParts(memberId, next) {
    const n = Math.max(1, Math.min(99, next));
    setPartInputs((prev) => ({ ...prev, [memberId]: n }));
  }

  function onSplitMethodChange(value) {
    const method = normalizeSplitMethod(value);
    setSplitMethod(method);
    setFieldErrors((prev) => ({ ...prev, exactIds: [] }));
    if (method === "SHARES") {
      const ids = includedIds.length
        ? includedIds
        : members.map((m) => m.id);
      const { parts } = resolveGroupSplitDefaults(
        {
          settings: {
            defaultSplitMethod: "SHARES",
            defaultSplitConfig: group?.settings?.defaultSplitConfig,
          },
        },
        ids
      );
      setPartInputs((prev) => {
        const next = { ...parts };
        for (const id of ids) {
          if (prev[id] >= 1) next[id] = prev[id];
        }
        return next;
      });
    }
  }

  function validateExpense() {
    const next = {
      amount: false,
      title: false,
      paidBy: false,
      exactIds: [],
      payerIds: [],
    };
    let ok = true;

    if (!amountMinor) {
      next.amount = true;
      ok = false;
    }
    if (!title.trim()) {
      next.title = true;
      ok = false;
    }
    if (!payerIds.length) {
      next.paidBy = true;
      ok = false;
    } else if (amountMinor > 0 && payerSum !== amountMinor) {
      next.paidBy = true;
      ok = false;
    }
    if (!includedIds.length) {
      ok = false;
    }
    if (splitMethod === "EXACT" && amountMinor > 0 && includedIds.length) {
      if (!splitPreview.valid) {
        next.exactIds = [...includedIds];
        ok = false;
      }
    }

    setFieldErrors(next);
    if (!ok) bumpShake();
    return ok;
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (saving) return;
    if (!validateExpense()) return;

    const payers = payerIds.map((memberId) => ({
      memberId,
      amountMinor:
        payerIds.length === 1
          ? amountMinor
          : resolvedPayerAmounts[memberId] || 0,
    }));

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        amountMinor,
        splitMethod,
        icon,
        categoryId: categoryKey,
        expenseDate: expenseAt.toISOString(),
        payers,
        participants: members.map((m) => ({
          memberId: m.id,
          included: includedIds.includes(m.id),
          inputValue: !includedIds.includes(m.id)
            ? null
            : splitMethod === "EQUAL"
              ? null
              : splitMethod === "SHARES"
                ? Number(partInputs[m.id] || 1)
                : Math.round(Number(exactInputs[m.id] || 0) * 100),
        })),
      };

      const res = await fetch(
        isEdit
          ? `/api/groups/${group.id}/expenses/${expense.id}`
          : `/api/groups/${group.id}/expenses`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit
              ? { ...payload, baseVersion: expense.version }
              : payload
          ),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        bumpShake();
        return;
      }
      setOpen(false);
      onClose?.();
      if (isEdit) onUpdated?.();
      else onCreated?.();
    } catch {
      bumpShake();
    } finally {
      setSaving(false);
    }
  }

  if (!group) return null;

  const form = (
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

        <div key={`title-${shakeKey}`} className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIconsOpen(true)}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-soft text-xl hover:bg-background"
            aria-label="Choose expense icon"
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
                "border-danger focus-visible:ring-danger animate-nsplit-shake"
            )}
          />
        </div>

        {!showDesc ? (
          <button
            type="button"
            onClick={() => setShowDesc(true)}
            className="text-sm text-primary"
          >
            + Add description
          </button>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted">
                Description
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowDesc(false);
                  setDescription("");
                }}
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
                aria-label="Remove description"
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional note"
              rows={3}
              className="min-h-18 resize-y"
              autoFocus
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            key={`paid-${shakeKey}`}
            onClick={openPayersModal}
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm hover:bg-soft",
              fieldErrors.paidBy && "border-danger animate-nsplit-shake"
            )}
          >
            <Users className="h-4 w-4 text-muted" />
            <span className="min-w-0 flex-1 truncate">
              <span className="block text-[10px] uppercase tracking-wide text-muted">
                Paid by
              </span>
              <span className="font-medium">{payerSummary}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={openWhenModal}
            className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-sm hover:bg-soft"
          >
            <CalendarDays className="h-4 w-4 text-muted" />
            <span className="min-w-0 flex-1 truncate">
              <span className="block text-[10px] uppercase tracking-wide text-muted">
                When
              </span>
              <span className="font-medium">
                {formatWhenLabel(expenseAt)}
              </span>
            </span>
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-background">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-background px-3 py-2">
            <span className="text-xs font-medium text-muted">Split with</span>
            <Select
              key={`split-method-${splitMethod}`}
              value={splitMethod}
              onValueChange={onSplitMethodChange}
            >
              <SelectTrigger className="h-7 w-[8.25rem] border-0 bg-soft shadow-none">
                <SelectValue
                  placeholder={
                    SPLIT_METHODS.find((m) => m.value === splitMethod)?.label ||
                    "Split"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {SPLIT_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ul className="divide-y divide-border">
            {members.map((m) => {
              const included = includedIds.includes(m.id);
              const share = included ? splitByMember[m.id] : 0;
              const parts = partInputs[m.id] ?? 1;
              const exactInvalid = fieldErrors.exactIds.includes(m.id);
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <Checkbox
                    checked={included}
                    onCheckedChange={() => toggleIncluded(m.id)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {memberLabel(m)}
                    </div>

                    {included && splitMethod === "EXACT" ? (
                      <Input
                        key={`exact-${m.id}-${shakeKey}`}
                        className={cn(
                          "mt-1 h-7 text-xs",
                          exactInvalid &&
                            "border-danger focus-visible:ring-danger animate-nsplit-shake"
                        )}
                        inputMode="decimal"
                        placeholder={currency}
                        value={exactInputs[m.id] ?? ""}
                        onChange={(e) => {
                          setExactInputs((prev) => ({
                            ...prev,
                            [m.id]: e.target.value,
                          }));
                          setFieldErrors((prev) => ({
                            ...prev,
                            exactIds: prev.exactIds.filter(
                              (id) => id !== m.id
                            ),
                          }));
                        }}
                      />
                    ) : null}

                    {included && splitMethod === "SHARES" ? (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-md border border-border bg-soft px-1 py-0.5">
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted hover:text-foreground disabled:opacity-40"
                          disabled={parts <= 1}
                          onClick={() => setParts(m.id, parts - 1)}
                          aria-label="Decrease parts"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-8 text-center text-xs font-semibold tabular-nums">
                          {parts}x
                        </span>
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted hover:text-foreground disabled:opacity-40"
                          disabled={parts >= 99}
                          onClick={() => setParts(m.id, parts + 1)}
                          aria-label="Increase parts"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      "shrink-0 text-sm font-medium tabular-nums",
                      included ? "text-foreground" : "text-muted"
                    )}
                  >
                    {amountMinor && included
                      ? formatMinor(share ?? 0, currency)
                      : "-"}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="shrink-0 border-t border-border bg-surface p-4">
        <Button type="submit" className="w-full" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add expense"}
        </Button>
      </div>
    </form>
  );

  const nestedDialogs = (
    <>
      <Dialog open={payersOpen} onOpenChange={setPayersOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Paid by</DialogTitle>
            <DialogDescription>
              Select one or more people who paid.
            </DialogDescription>
          </DialogHeader>

          <ul className="nsplit-scroll max-h-72 space-y-1 overflow-y-auto">
            {members.map((m) => {
              const checked = draftPayerIds.includes(m.id);
              const amountInvalid = payerFieldErrors.includes(m.id);
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-soft"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleDraftPayer(m.id)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {memberLabel(m)}
                  </span>
                  {checked && draftPayerIds.length > 1 ? (
                    <Input
                      key={`payer-amt-${m.id}-${payerShakeKey}`}
                      className={cn(
                        "h-8 w-24 text-right text-xs",
                        amountInvalid &&
                          "border-danger focus-visible:ring-danger animate-nsplit-shake"
                      )}
                      inputMode="decimal"
                      value={
                        draftPayerAmounts[m.id] != null
                          ? (draftPayerAmounts[m.id] / 100).toString()
                          : ""
                      }
                      onChange={(e) => {
                        const major = Number(e.target.value);
                        setDraftPayerAmounts((prev) => ({
                          ...prev,
                          [m.id]: Number.isFinite(major)
                            ? Math.round(major * 100)
                            : 0,
                        }));
                        setPayerFieldErrors((prev) =>
                          prev.filter((id) => id !== m.id)
                        );
                      }}
                    />
                  ) : checked ? (
                    <span className="text-xs font-medium tabular-nums">
                      {formatMinor(amountMinor, currency)}
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPayersOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={savePayers}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={iconsOpen} onOpenChange={setIconsOpen}>
        <DialogContent className="flex max-h-[min(85vh,560px)] max-w-md flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
            <DialogTitle>Choose icon</DialogTitle>
            <DialogDescription>
              Tap an emoji for this expense.
            </DialogDescription>
          </DialogHeader>

          <div className="nsplit-scroll min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3">
            {EXPENSE_ICON_SECTIONS.map((section) => (
              <div key={section.label}>
                <div className="mb-2 text-xs font-medium text-muted">
                  {section.label}
                </div>
                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                  {section.icons.map((item) => {
                    const selected = icon === item.emoji;
                    return (
                      <button
                        key={`${section.label}-${item.emoji}-${item.categoryKey || ""}`}
                        type="button"
                        title={item.label}
                        onClick={() => pickIcon(item.emoji, item.categoryKey)}
                        className={cn(
                          "flex h-10 w-full items-center justify-center rounded-lg border text-xl transition-colors hover:bg-soft",
                          selected
                            ? "border-primary bg-soft"
                            : "border-border bg-background"
                        )}
                      >
                        {item.emoji}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="shrink-0 border-t border-border p-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setIconManual(false);
                applyTitleSuggestion(title, { force: true });
                setIconsOpen(false);
              }}
            >
              Auto from title
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                          { hour: "numeric", minute: "2-digit" }
                        )
                      : "-"}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted transition-transform",
                        timeOpen && "rotate-180"
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

  if (embedded) {
    return (
      <>
        {form}
        {nestedDialogs}
      </>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button">{triggerLabel}</Button>
        </DialogTrigger>

        <DialogContent className="flex max-h-[min(90vh,720px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
            <DialogTitle>{isEdit ? "Edit expense" : "Add expense"}</DialogTitle>
            <DialogDescription className="sr-only">
              Amount, title, who paid, and how to split.
            </DialogDescription>
          </DialogHeader>
          {form}
        </DialogContent>
      </Dialog>
      {nestedDialogs}
    </>
  );
}
