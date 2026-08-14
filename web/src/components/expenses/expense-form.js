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
import { EmojiPicker } from "@/components/emoji-picker";
import { suggestEmojiFromText } from "@/lib/emoji-icons";
import {
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
  included: false,
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
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(minor) || 0) / 100);
}

function parseMajorToMinor(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

function minorToExactInput(minor) {
  if (!minor || minor <= 0) return "0";
  return (minor / 100).toString();
}

function exactMapFromTotal(memberIds, totalMinor) {
  const dist = distributePayerAmounts(Math.max(0, totalMinor || 0), memberIds);
  const map = {};
  for (const id of memberIds) map[id] = minorToExactInput(dist[id] || 0);
  return map;
}

function includedFromExactMap(memberIds, exactMap) {
  return memberIds.filter((id) => parseMajorToMinor(exactMap[id]) > 0);
}

function waterfallExact(memberIds, editedId, typedMinor, totalMinor, prevInputs) {
  const idx = memberIds.indexOf(editedId);
  const next = { ...prevInputs };
  if (idx < 0) {
    next[editedId] = minorToExactInput(typedMinor);
    return next;
  }

  let before = 0;
  for (let i = 0; i < idx; i += 1) {
    before += parseMajorToMinor(next[memberIds[i]]);
  }
  const maxThis = Math.max(0, totalMinor - before);
  const thisMinor = Math.min(Math.max(0, typedMinor), maxThis);
  next[editedId] = minorToExactInput(thisMinor);

  const remaining = totalMinor - before - thisMinor;
  const afterIds = memberIds.slice(idx + 1);
  if (!afterIds.length) return next;
  const dist = distributePayerAmounts(remaining, afterIds);
  for (const id of afterIds) {
    next[id] = minorToExactInput(dist[id] || 0);
  }
  return next;
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
  const isEdit = Boolean(expense?._id);
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
    normalizeSplitMethod(group?.settings?.defaultSplitMethod),
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
  const [amountTouched, setAmountTouched] = useState(false);

  const [payersOpen, setPayersOpen] = useState(false);
  const [whenOpen, setWhenOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("");
  const [draftTime, setDraftTime] = useState("");
  const [timeOpen, setTimeOpen] = useState(false);
  const [draftPayerIds, setDraftPayerIds] = useState([]);
  const [draftPayerAmounts, setDraftPayerAmounts] = useState({});
  const [payerFieldErrors, setPayerFieldErrors] = useState([]);
  const [payerShakeKey, setPayerShakeKey] = useState(0);

  function applyTitleSuggestion(nextTitle) {
    if (iconManual) return;
    const suggested = suggestEmojiFromText(nextTitle);
    setCategoryKey(suggested.categoryKey || "other");
    setIcon(suggested.emoji);
  }

  function pickIcon(item) {
    setIcon(item.emoji);
    setCategoryKey(item.categoryKey || categoryKeyForEmoji(item.emoji));
    setIconManual(true);
  }

  function bumpShake() {
    setShakeKey((k) => k + 1);
  }

  function bumpPayerShake() {
    setPayerShakeKey((k) => k + 1);
  }

  function resetForm() {
    const ids = members.map((m) => m._id);
    setAmount("");
    setTitle("");
    setDescription("");
    setShowDesc(false);
    const fallback = suggestEmojiFromText("");
    setCategoryKey(fallback.categoryKey || "other");
    setIcon(fallback.emoji);
    setIconManual(false);
    setExactInputs({});
    const { method, parts } = resolveGroupSplitDefaults(group, ids);
    setSplitMethod(method);
    setPartInputs(parts);
    setExpenseAt(new Date());
    setIncludedIds(ids);
    setAmountTouched(false);
    setFieldErrors(EMPTY_FIELD_ERRORS);
    if (defaultPayer) {
      setPayerIds([defaultPayer._id]);
      setPayerAmounts({});
    } else {
      setPayerIds([]);
      setPayerAmounts({});
    }
  }

  function hydrateFromExpense(exp) {
    const memberIds = new Set(members.map((m) => m._id));
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
        (s) => (s.amountMinor || 0) > 0 && memberIds.has(String(s.memberId)),
      )
      .map((s) => String(s.memberId));
    const nextIncluded = included.length ? included : fallbackIncluded;
    setIncludedIds(
      nextIncluded.length ? nextIncluded : members.map((m) => m._id),
    );

    const exact = {};
    for (const m of members) exact[m._id] = "0";
    const { parts: defaultShareParts } = resolveGroupSplitDefaults(
      {
        settings: {
          defaultSplitMethod: "SHARES",
          defaultSplitConfig: group?.settings?.defaultSplitConfig,
        },
      },
      members.map((m) => m._id),
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
    for (const m of members) {
      if (!nextIncluded.includes(m._id)) parts[m._id] = 0;
    }
    setExactInputs(exact);
    setPartInputs(parts);

    const payers = (exp.payers || []).filter((p) =>
      memberIds.has(String(p.memberId)),
    );
    if (payers.length) {
      setPayerIds(payers.map((p) => String(p.memberId)));
      const amounts = {};
      for (const p of payers) amounts[String(p.memberId)] = p.amountMinor || 0;
      setPayerAmounts(amounts);
    } else if (defaultPayer) {
      setPayerIds([defaultPayer._id]);
      setPayerAmounts({});
    } else {
      setPayerIds([]);
      setPayerAmounts({});
    }

    const when = exp.expenseDate || exp.createdAt;
    setExpenseAt(when ? new Date(when) : new Date());
    setAmountTouched(true);
    setFieldErrors(EMPTY_FIELD_ERRORS);
  }

  const defaultSplitMethod = normalizeSplitMethod(
    group?.settings?.defaultSplitMethod,
  );
  const defaultSplitConfigKey = JSON.stringify(
    group?.settings?.defaultSplitConfig ?? null,
  );

  useEffect(() => {
    const isActive = embedded ? active : open;
    if (!isActive || !members.length) return;
    if (expense?._id) hydrateFromExpense(expense);
    else resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    embedded,
    active,
    open,
    group?._id,
    expense?._id,
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
    const hasManual = payerIds.every((id) =>
      Number.isInteger(payerAmounts[id]),
    );
    if (hasManual) return payerAmounts;
    return distributePayerAmounts(amountMinor, payerIds);
  }, [amountMinor, payerIds, payerAmounts]);

  const payerSum = useMemo(
    () => payerIds.reduce((s, id) => s + (resolvedPayerAmounts[id] || 0), 0),
    [payerIds, resolvedPayerAmounts],
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
    [draftPayerIds, draftPayerAmounts, amountMinor],
  );

  const payerSummary = useMemo(() => {
    if (!payerIds.length) return "Select payer";
    if (payerIds.length === 1) {
      const m = members.find((x) => x._id === payerIds[0]);
      return m ? memberLabel(m) : "1 payer";
    }
    return `${payerIds.length} people paid`;
  }, [payerIds, members]);

  function openPayersModal() {
    setDraftPayerIds(
      payerIds.length ? payerIds : defaultPayer ? [defaultPayer._id] : [],
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

  function applyEqualExact(totalMinor) {
    const ids = members.map((m) => m._id);
    if (!ids.length) return;
    if (!totalMinor || totalMinor <= 0) {
      const zeros = {};
      for (const id of ids) zeros[id] = "0";
      setExactInputs(zeros);
      setIncludedIds([]);
      return;
    }
    const next = exactMapFromTotal(ids, totalMinor);
    setExactInputs(next);
    setIncludedIds(includedFromExactMap(ids, next));
  }

  function toggleIncluded(memberId) {
    setFieldErrors((prev) => ({ ...prev, included: false }));
    const ids = members.map((m) => m._id);
    const isOn = includedIds.includes(memberId);

    if (splitMethod === "SHARES") {
      if (isOn) {
        setPartInputs((p) => ({ ...p, [memberId]: 0 }));
        setIncludedIds((prev) => prev.filter((id) => id !== memberId));
      } else {
        setPartInputs((p) => ({
          ...p,
          [memberId]: p[memberId] > 0 ? p[memberId] : 1,
        }));
        setIncludedIds((prev) =>
          prev.includes(memberId) ? prev : [...prev, memberId],
        );
      }
      return;
    }

    if (splitMethod === "EXACT") {
      if (isOn) {
        const next = { ...exactInputs, [memberId]: "0" };
        const remainingIds = includedIds.filter((id) => id !== memberId);
        if (amountTouched && amountMinor > 0 && remainingIds.length) {
          const dist = distributePayerAmounts(amountMinor, remainingIds);
          for (const id of ids) {
            next[id] =
              id === memberId ? "0" : minorToExactInput(dist[id] || 0);
          }
        }
        setExactInputs(next);
        setIncludedIds(includedFromExactMap(ids, next));
      } else if (amountTouched && amountMinor > 0) {
        const othersSum = ids
          .filter((id) => id !== memberId)
          .reduce((s, id) => s + parseMajorToMinor(exactInputs[id]), 0);
        const leftover = Math.max(0, amountMinor - othersSum);
        let next = { ...exactInputs };
        if (leftover > 0) {
          next[memberId] = minorToExactInput(leftover);
        } else {
          const nowIds = [...new Set([...includedIds, memberId])];
          next = exactMapFromTotal(nowIds, amountMinor);
          for (const id of ids) {
            if (!nowIds.includes(id)) next[id] = "0";
          }
        }
        setExactInputs(next);
        setIncludedIds(includedFromExactMap(ids, next));
      } else {
        setIncludedIds((prev) =>
          prev.includes(memberId) ? prev : [...prev, memberId],
        );
      }
      return;
    }

    setIncludedIds((prev) =>
      isOn ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  }

  function toggleAllIncluded() {
    setFieldErrors((prev) => ({ ...prev, included: false }));
    const ids = members.map((m) => m._id);
    const allOn =
      ids.length > 0 && ids.every((id) => includedIds.includes(id));
    if (allOn) {
      setIncludedIds([]);
      if (splitMethod === "SHARES") {
        setPartInputs((prev) => {
          const next = { ...prev };
          for (const id of ids) next[id] = 0;
          return next;
        });
      }
      if (splitMethod === "EXACT") {
        const zeros = {};
        for (const id of ids) zeros[id] = "0";
        setExactInputs(zeros);
      }
      return;
    }

    if (splitMethod === "EXACT" && amountTouched && amountMinor > 0) {
      applyEqualExact(amountMinor);
      return;
    }

    setIncludedIds(ids);
    if (splitMethod === "SHARES") {
      const { parts } = resolveGroupSplitDefaults(
        {
          settings: {
            defaultSplitMethod: "SHARES",
            defaultSplitConfig: group?.settings?.defaultSplitConfig,
          },
        },
        ids,
      );
      setPartInputs((prev) => {
        const next = { ...parts };
        for (const id of ids) {
          if (prev[id] >= 1) next[id] = prev[id];
          if (!next[id]) next[id] = 1;
        }
        return next;
      });
    }
  }

  function setParts(memberId, nextValue) {
    setFieldErrors((prev) => ({ ...prev, included: false }));
    const n = Math.max(0, Math.min(99, nextValue));
    setPartInputs((prev) => ({ ...prev, [memberId]: n }));
    setIncludedIds((prev) => {
      if (n <= 0) return prev.filter((id) => id !== memberId);
      if (prev.includes(memberId)) return prev;
      return [...prev, memberId];
    });
  }

  function onExactAmountChange(memberId, raw) {
    const ids = members.map((m) => m._id);
    const typedMinor = parseMajorToMinor(raw);

    if (!amountTouched || !amountMinor) {
      const next = { ...exactInputs, [memberId]: raw };
      setExactInputs(next);
      setIncludedIds(includedFromExactMap(ids, next));
      const sum = ids.reduce(
        (s, id) => s + parseMajorToMinor(id === memberId ? raw : next[id]),
        0,
      );
      if (sum > 0) setAmount((sum / 100).toString());
      return;
    }

    const next = waterfallExact(
      ids,
      memberId,
      typedMinor,
      amountMinor,
      exactInputs,
    );
    const maxThis =
      amountMinor -
      ids
        .slice(0, ids.indexOf(memberId))
        .reduce((s, id) => s + parseMajorToMinor(exactInputs[id]), 0);
    const clamped = typedMinor > Math.max(0, maxThis);
    next[memberId] = clamped ? minorToExactInput(Math.max(0, maxThis)) : raw || "0";
    setExactInputs(next);
    setIncludedIds(includedFromExactMap(ids, next));
  }

  function onSplitMethodChange(value) {
    const method = normalizeSplitMethod(value);
    setSplitMethod(method);
    setFieldErrors((prev) => ({ ...prev, exactIds: [], included: false }));
    const ids = members.map((m) => m._id);
    if (method === "SHARES") {
      const activeIds = includedIds.length ? includedIds : ids;
      const { parts } = resolveGroupSplitDefaults(
        {
          settings: {
            defaultSplitMethod: "SHARES",
            defaultSplitConfig: group?.settings?.defaultSplitConfig,
          },
        },
        activeIds,
      );
      setPartInputs((prev) => {
        const next = { ...parts };
        for (const id of ids) {
          if (!includedIds.includes(id) && includedIds.length) next[id] = 0;
          else if (prev[id] >= 1) next[id] = prev[id];
          else if (next[id] == null) next[id] = 1;
        }
        return next;
      });
    }
    if (method === "EXACT" && amountMinor > 0) {
      applyEqualExact(amountMinor);
    }
  }

  function validateExpense() {
    const next = {
      amount: false,
      title: false,
      paidBy: false,
      included: false,
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
      next.included = true;
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
          memberId: m._id,
          included: includedIds.includes(m._id),
          inputValue: !includedIds.includes(m._id)
            ? null
            : splitMethod === "EQUAL"
              ? null
              : splitMethod === "SHARES"
                ? Number(partInputs[m._id] || 1)
                : Math.round(Number(exactInputs[m._id] || 0) * 100),
        })),
      };

      const res = await fetch(
        isEdit
          ? `/api/groups/${group.code}/expenses/${expense._id}`
          : `/api/groups/${group.code}/expenses`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit ? { ...payload, baseVersion: expense.version } : payload,
          ),
        },
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
              const next = e.target.value;
              setAmount(next);
              setAmountTouched(true);
              setFieldErrors((prev) => ({ ...prev, amount: false }));
              if (splitMethod === "EXACT") {
                const n = Number(next);
                const minor =
                  Number.isFinite(n) && n > 0 ? Math.round(n * 100) : 0;
                applyEqualExact(minor);
              }
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
                "border-danger focus-visible:ring-danger animate-nsplit-shake",
            )}
          />
        </div>

        {!showDesc ? (
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDesc(true)}
              className="text-sm text-primary dark:text-primary-foreground/70 hover:text-primary/80 dark:hover:text-primary-foreground cursor-pointer"
            >
              + Add description
            </button>
          </div>
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
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground cursor-pointer"
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
              fieldErrors.paidBy && "border-danger animate-nsplit-shake",
            )}
          >
            <Users className="h-4 w-4 text-muted" />
            <span className="min-w-0 flex-1 truncate">
              <span className="block text-[10px] tracking-wide text-muted">
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
              <span className="block text-[10px] tracking-wide text-muted">
                When
              </span>
              <span className="font-medium">{formatWhenLabel(expenseAt)}</span>
            </span>
          </button>
        </div>

        <div
          key={`split-${shakeKey}`}
          className={cn(
            "overflow-hidden rounded-xl border border-border bg-background",
            fieldErrors.included && "border-danger animate-nsplit-shake",
          )}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-background px-3 py-2">
            <label className="flex items-center gap-2">
              <Checkbox
                checked={
                  members.length > 0 &&
                  members.every((m) => includedIds.includes(m._id))
                }
                onCheckedChange={toggleAllIncluded}
                aria-label="Select all members"
              />
              <span className="text-xs font-medium text-muted">Split with</span>
            </label>
            <Select
              key={`split-method-${splitMethod}`}
              value={splitMethod}
              onValueChange={onSplitMethodChange}
            >
              <SelectTrigger className="h-7 w-33 border-0 bg-soft shadow-none">
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
              const included = includedIds.includes(m._id);
              const share = included ? splitByMember[m._id] : 0;
              const parts = partInputs[m._id] ?? 0;
              const exactInvalid = fieldErrors.exactIds.includes(m._id);
              return (
                <li key={m._id} className="flex items-center gap-3 px-3 py-2.5">
                  <Checkbox
                    checked={included}
                    onCheckedChange={() => toggleIncluded(m._id)}
                  />
                  <div className="min-w-0 flex-1 truncate text-sm font-medium">
                    {memberLabel(m)}
                  </div>
                  <div className="flex h-7 min-w-[7.5rem] shrink-0 items-center justify-end gap-2">
                    {splitMethod === "EXACT" ? (
                      <Input
                        key={`exact-${m._id}-${shakeKey}`}
                        className={cn(
                          "h-7 w-20 text-end text-xs",
                          exactInvalid &&
                            "border-danger focus-visible:ring-danger animate-nsplit-shake",
                        )}
                        inputMode="decimal"
                        placeholder="0.00"
                        value={exactInputs[m._id] ?? "0"}
                        onChange={(e) => {
                          onExactAmountChange(m._id, e.target.value);
                          setFieldErrors((prev) => ({
                            ...prev,
                            exactIds: prev.exactIds.filter((id) => id !== m._id),
                            included: false,
                          }));
                        }}
                      />
                    ) : null}

                    {splitMethod === "SHARES" ? (
                      <>
                        <div
                          className={cn(
                            "text-sm font-medium tabular-nums",
                            included ? "text-foreground" : "text-muted",
                          )}
                        >
                          {formatMinor(share ?? 0, currency)}
                        </div>
                        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-soft px-1 py-0.5">
                          <button
                            type="button"
                            className="rounded p-0.5 text-muted hover:text-foreground disabled:opacity-40"
                            disabled={parts <= 0}
                            onClick={() => setParts(m._id, parts - 1)}
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
                            onClick={() => setParts(m._id, parts + 1)}
                            aria-label="Increase parts"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    ) : null}

                    {splitMethod === "EQUAL" ? (
                      <div
                        className={cn(
                          "text-sm font-medium tabular-nums",
                          included ? "text-foreground" : "text-muted",
                        )}
                      >
                        {formatMinor(share ?? 0, currency)}
                      </div>
                    ) : null}
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
              const checked = draftPayerIds.includes(m._id);
              const amountInvalid = payerFieldErrors.includes(m._id);
              return (
                <li
                  key={m._id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-soft"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggleDraftPayer(m._id)}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {memberLabel(m)}
                  </span>
                  {checked && draftPayerIds.length > 1 ? (
                    <Input
                      key={`payer-amt-${m._id}-${payerShakeKey}`}
                      className={cn(
                        "h-8 w-24 text-right text-xs",
                        amountInvalid &&
                          "border-danger focus-visible:ring-danger animate-nsplit-shake",
                      )}
                      inputMode="decimal"
                      value={
                        draftPayerAmounts[m._id] != null
                          ? (draftPayerAmounts[m._id] / 100).toString()
                          : ""
                      }
                      onChange={(e) => {
                        const major = Number(e.target.value);
                        setDraftPayerAmounts((prev) => ({
                          ...prev,
                          [m._id]: Number.isFinite(major)
                            ? Math.round(major * 100)
                            : 0,
                        }));
                        setPayerFieldErrors((prev) =>
                          prev.filter((id) => id !== m._id),
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

      <EmojiPicker
        open={iconsOpen}
        onOpenChange={setIconsOpen}
        value={icon}
        onSelect={pickIcon}
        description="Tap an emoji for this expense."
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
