import Feather from "@expo/vector-icons/Feather";
import { Check as CheckIcon, ChevronsUpDown } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  InputAccessoryView,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { EmojiPickerModal } from "@/components/expenses/emoji-picker-modal";
import { WhenField } from "@/components/expenses/when-field";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Text as UIText } from "@/components/ui/text";
import { UserAvatar } from "@/components/user-avatar";
import { useColors } from "@/hooks/use-colors";
import { cn } from "@/lib/utils";
import type { Expense, GroupDetail, GroupMember } from "@/src/api/types";
import { saveExpense } from "@/src/db/expenses";
import {
  categoryKeyForEmoji,
  suggestEmojiFromText,
} from "@/src/lib/expense-icons";
import {
  exactMapFromTotal,
  includedFromExactMap,
  minorToExactInput,
  normalizeSplitMethod,
  parseMajorToMinor,
  resolveGroupSplitDefaults,
  SPLIT_METHODS,
  waterfallExact,
  type SplitMethodValue,
} from "@/src/lib/expense-form-utils";
import { getExpenseEmoji } from "@/src/lib/icons";
import {
  memberListLabel,
  resolveMyMember,
  sortMembersByName,
} from "@/src/lib/members";
import { calculateSplit, distributePayerAmounts } from "@/src/lib/split";
import { formatMinor } from "@/src/lib/format";

const EMPTY_FIELD_ERRORS = {
  amount: false,
  title: false,
  paidBy: false,
  included: false,
  exactIds: [] as string[],
};

const KEYBOARD_ACCESSORY_ID = "expense-form-next";

function Check({
  on,
  colors,
}: {
  on: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: on ? colors.primary : "transparent",
        borderColor: on ? colors.primary : colors.border,
      }}
    >
      {on ? <Feather name="check" size={16} color="#ffffff" /> : null}
    </View>
  );
}

export function ExpenseForm({
  group,
  currentUserId,
  myName,
  matchByName = true,
  myMemberId,
  expense = null,
  onSaved,
}: {
  group: GroupDetail;
  currentUserId?: string | null;
  myName?: string | null;
  matchByName?: boolean;
  myMemberId?: string | null;
  expense?: Expense | null;
  onSaved: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const sheetHeight = Math.min(height * 0.5, 420);
  const isEdit = Boolean(expense?._id);
  const members = useMemo(
    () => sortMembersByName(group?.members || []),
    [group?.members],
  );
  const currency = group?.currency || "INR";
  const selfMember = useMemo(
    () =>
      resolveMyMember(members, {
        userId: currentUserId,
        myName,
        matchByName,
        myMemberId: myMemberId || group?.myMembershipId,
      }),
    [
      members,
      currentUserId,
      myName,
      matchByName,
      myMemberId,
      group?.myMembershipId,
    ],
  );
  const selfId = selfMember?._id;
  const defaultPayer = selfMember || members[0] || null;

  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const [categoryKey, setCategoryKey] = useState("other");
  const [icon, setIcon] = useState(() => getExpenseEmoji(null, "other"));
  const [iconManual, setIconManual] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [showDesc, setShowDesc] = useState(false);
  const [description, setDescription] = useState("");
  const [splitMethod, setSplitMethod] = useState<SplitMethodValue>(() =>
    normalizeSplitMethod(group?.settings?.defaultSplitMethod),
  );
  const [includedIds, setIncludedIds] = useState<string[]>([]);
  const [exactInputs, setExactInputs] = useState<Record<string, string>>({});
  const [partInputs, setPartInputs] = useState<Record<string, number>>({});
  const [payerIds, setPayerIds] = useState<string[]>([]);
  const [payerAmounts, setPayerAmounts] = useState<Record<string, number>>({});
  const [expenseAt, setExpenseAt] = useState(() => new Date());
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState(EMPTY_FIELD_ERRORS);
  const [amountTouched, setAmountTouched] = useState(false);
  const [error, setError] = useState("");

  const [payersOpen, setPayersOpen] = useState(false);
  const [draftPayerIds, setDraftPayerIds] = useState<string[]>([]);
  const [draftPayerAmounts, setDraftPayerAmounts] = useState<
    Record<string, number>
  >({});
  const [payerFieldErrors, setPayerFieldErrors] = useState<string[]>([]);
  const [keyboardAccessoryLabel, setKeyboardAccessoryLabel] = useState<
    "Next" | "Done"
  >("Next");

  const titleRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const exactInputRefs = useRef<Record<string, TextInput | null>>({});
  const payerInputRefs = useRef<Record<string, TextInput | null>>({});
  const keyboardAccessoryActionRef = useRef<() => void>(() => {});

  function setKeyboardAccessory(label: "Next" | "Done", action: () => void) {
    setKeyboardAccessoryLabel(label);
    keyboardAccessoryActionRef.current = action;
  }

  function focusTitle() {
    titleRef.current?.focus();
  }

  function focusDescriptionOrDone() {
    if (showDesc) descriptionRef.current?.focus();
    else Keyboard.dismiss();
  }

  function focusNextExact(memberId: string) {
    const ids = members.map((m) => m._id);
    const nextId = ids[ids.indexOf(memberId) + 1];
    if (nextId) exactInputRefs.current[nextId]?.focus();
    else Keyboard.dismiss();
  }

  function focusNextPayer(memberId: string) {
    const nextId = draftPayerIds[draftPayerIds.indexOf(memberId) + 1];
    if (nextId) payerInputRefs.current[nextId]?.focus();
    else Keyboard.dismiss();
  }

  const iosAccessoryId =
    Platform.OS === "ios" ? KEYBOARD_ACCESSORY_ID : undefined;

  function applyTitleSuggestion(nextTitle: string) {
    if (iconManual) return;
    const suggested = suggestEmojiFromText(nextTitle);
    setCategoryKey(suggested.categoryKey || "other");
    setIcon(suggested.emoji);
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
    setError("");
    if (defaultPayer) {
      setPayerIds([defaultPayer._id]);
      setPayerAmounts({});
    } else {
      setPayerIds([]);
      setPayerAmounts({});
    }
  }

  function hydrateFromExpense(exp: Expense) {
    const memberIds = new Set(members.map((m) => m._id));
    setAmount(((exp.amountMinor || 0) / 100).toString());
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

    const exact: Record<string, string> = {};
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
      if (method === "EXACT")
        exact[mid] = ((s.amountMinor || 0) / 100).toString();
      if (method === "SHARES") {
        const n = Number(s.inputValue);
        if (Number.isFinite(n) && n >= 1)
          parts[mid] = Math.min(99, Math.round(n));
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
      const amounts: Record<string, number> = {};
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
    setError("");
  }

  useEffect(() => {
    if (!members.length) return;
    if (expense?._id) hydrateFromExpense(expense);
    else resetForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?._id, expense?._id, members.length]);

  const amountMinor = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 100);
  }, [amount]);

  const resolvedPayerAmounts = useMemo(() => {
    if (!payerIds.length) return {} as Record<string, number>;
    if (payerIds.length === 1) return { [payerIds[0]]: amountMinor };
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
      return {
        valid: true,
        splits: [] as { memberId: string; amountMinor: number }[],
        errors: [] as string[],
      };
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
    const map: Record<string, number> = {};
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
      return m ? memberListLabel(m, currentUserId, selfId) : "1 payer";
    }
    return `${payerIds.length} people paid`;
  }, [payerIds, members, currentUserId]);

  function applyEqualExact(totalMinor: number) {
    const ids = members.map((m) => m._id);
    if (!ids.length) return;
    if (!totalMinor || totalMinor <= 0) {
      const zeros: Record<string, string> = {};
      for (const id of ids) zeros[id] = "0";
      setExactInputs(zeros);
      setIncludedIds([]);
      return;
    }
    const next = exactMapFromTotal(ids, totalMinor);
    setExactInputs(next);
    setIncludedIds(includedFromExactMap(ids, next));
  }

  function toggleIncluded(memberId: string) {
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
            next[id] = id === memberId ? "0" : minorToExactInput(dist[id] || 0);
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
    const allOn = ids.length > 0 && ids.every((id) => includedIds.includes(id));
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
        const zeros: Record<string, string> = {};
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

  function setParts(memberId: string, nextValue: number) {
    setFieldErrors((prev) => ({ ...prev, included: false }));
    const n = Math.max(0, Math.min(99, nextValue));
    setPartInputs((prev) => ({ ...prev, [memberId]: n }));
    setIncludedIds((prev) => {
      if (n <= 0) return prev.filter((id) => id !== memberId);
      if (prev.includes(memberId)) return prev;
      return [...prev, memberId];
    });
  }

  function onExactAmountChange(memberId: string, raw: string) {
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
    next[memberId] = clamped
      ? minorToExactInput(Math.max(0, maxThis))
      : raw || "0";
    setExactInputs(next);
    setIncludedIds(includedFromExactMap(ids, next));
  }

  function onSplitMethodChange(method: SplitMethodValue) {
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
    if (method === "EXACT" && amountMinor > 0) applyEqualExact(amountMinor);
  }

  function openPayersModal() {
    setDraftPayerIds(
      payerIds.length ? payerIds : defaultPayer ? [defaultPayer._id] : [],
    );
    setDraftPayerAmounts({ ...resolvedPayerAmounts });
    setPayerFieldErrors([]);
    setPayersOpen(true);
  }

  function toggleDraftPayer(memberId: string) {
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
    if (!draftPayerIds.length) return;
    const unbalanced =
      draftPayerIds.length > 1 &&
      amountMinor > 0 &&
      draftPayerSum !== amountMinor;
    if (unbalanced) {
      setPayerFieldErrors(draftPayerIds);
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

  function validateExpense() {
    const next = {
      amount: false,
      title: false,
      paidBy: false,
      included: false,
      exactIds: [] as string[],
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
    if (!payerIds.length || (amountMinor > 0 && payerSum !== amountMinor)) {
      next.paidBy = true;
      ok = false;
    }
    if (!includedIds.length) {
      next.included = true;
      ok = false;
    }
    if (
      splitMethod === "EXACT" &&
      amountMinor > 0 &&
      includedIds.length &&
      !splitPreview.valid
    ) {
      next.exactIds = [...includedIds];
      ok = false;
    }
    setFieldErrors(next);
    return ok;
  }

  async function onSubmit() {
    if (saving) return;
    setError("");
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
      await saveExpense(
        group._id,
        { ...payload, createdById: currentUserId },
        expense?._id,
      );
      Keyboard.dismiss();
      onSaved();
    } catch {
      setError(isEdit ? "Failed to save expense" : "Failed to add expense");
      setSaving(false);
    }
  }

  const allOn =
    members.length > 0 && members.every((m) => includedIds.includes(m._id));

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          placeholder="0.00"
          autoFocus
          placeholderTextColor={colors.textSecondary}
          keyboardType="decimal-pad"
          returnKeyType="next"
          enterKeyHint="next"
          submitBehavior="submit"
          inputAccessoryViewID={iosAccessoryId}
          onFocus={() => setKeyboardAccessory("Next", focusTitle)}
          onSubmitEditing={focusTitle}
          value={amount}
          onChangeText={(next) => {
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
          style={[
            styles.amount,
            {
              color: colors.text,
              backgroundColor: colors.softSurface,
              borderColor: fieldErrors.amount ? colors.danger : colors.border,
            },
          ]}
        />

        <View style={styles.titleRow}>
          <Pressable
            onPress={() => setIconsOpen(true)}
            style={[
              styles.iconBtn,
              {
                borderColor: colors.border,
                backgroundColor: colors.softSurface,
              },
            ]}
          >
            <Text style={{ fontSize: 22 }}>{icon}</Text>
          </Pressable>
          <TextInput
            ref={titleRef}
            placeholder="Title"
            placeholderTextColor={colors.textSecondary}
            returnKeyType={showDesc ? "next" : "done"}
            enterKeyHint={showDesc ? "next" : "done"}
            submitBehavior={showDesc ? "submit" : "blurAndSubmit"}
            onSubmitEditing={focusDescriptionOrDone}
            value={title}
            onChangeText={(next) => {
              setTitle(next);
              setFieldErrors((prev) => ({ ...prev, title: false }));
              applyTitleSuggestion(next);
            }}
            style={[
              styles.titleInput,
              {
                color: colors.text,
                backgroundColor: colors.background,
                borderColor: fieldErrors.title ? colors.danger : colors.border,
              },
            ]}
          />
        </View>

        {!showDesc ? (
          <Pressable
            onPress={() => setShowDesc(true)}
            style={{ alignSelf: "flex-end" }}
          >
            <Text
              style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}
            >
              + Add description
            </Text>
          </Pressable>
        ) : (
          <View style={{ gap: 6 }}>
            <View style={styles.descHead}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                Description
              </Text>
              <Pressable
                onPress={() => {
                  setShowDesc(false);
                  setDescription("");
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Remove
                </Text>
              </Pressable>
            </View>
            <TextInput
              ref={descriptionRef}
              value={description}
              onChangeText={setDescription}
              placeholder="Optional note"
              placeholderTextColor={colors.textSecondary}
              multiline
              style={[
                styles.desc,
                {
                  color: colors.text,
                  borderColor: colors.border,
                  backgroundColor: colors.background,
                },
              ]}
            />
          </View>
        )}

        <View style={styles.metaRow}>
          <Pressable
            onPress={openPayersModal}
            style={[
              styles.metaBtn,
              {
                borderColor: fieldErrors.paidBy ? colors.danger : colors.border,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
              Paid by
            </Text>
            <Text
              style={{ color: colors.text, fontWeight: "600" }}
              numberOfLines={1}
            >
              {payerSummary}
            </Text>
          </Pressable>
          <WhenField value={expenseAt} onChange={setExpenseAt} />
        </View>

        <View
          style={[
            styles.splitCard,
            {
              borderColor: fieldErrors.included ? colors.danger : colors.border,
              backgroundColor: colors.surface,
            },
          ]}
        >
          <View
            style={[styles.splitHead, { borderBottomColor: colors.border }]}
          >
            <Pressable onPress={toggleAllIncluded} style={styles.splitAll}>
              <Check on={allOn} colors={colors} />
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Split with
              </Text>
            </Pressable>
            <Popover>
              <PopoverTrigger
                className="flex-row items-center gap-0.5"
                hitSlop={8}
              >
                <UIText className="text-primary text-[13px] font-bold">
                  {SPLIT_METHODS.find((m) => m.value === splitMethod)?.label}
                </UIText>
                <Icon as={ChevronsUpDown} size={18} className="text-primary" />
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={6}
                className="w-44 p-1"
              >
                {SPLIT_METHODS.map((m) => {
                  const active = splitMethod === m.value;
                  return (
                    <PopoverClose asChild key={m.value}>
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-10 w-full justify-between rounded-sm px-3",
                          active && "bg-accent",
                        )}
                        onPress={() => onSplitMethodChange(m.value)}
                      >
                        <UIText
                          className={cn(
                            "text-sm",
                            active ? "font-bold" : "font-medium",
                          )}
                        >
                          {m.label}
                        </UIText>
                        {active ? (
                          <Icon
                            as={CheckIcon}
                            size={16}
                            className="text-primary"
                          />
                        ) : null}
                      </Button>
                    </PopoverClose>
                  );
                })}
              </PopoverContent>
            </Popover>
          </View>

          {members.map((m) => {
            const included = includedIds.includes(m._id);
            const share = included ? splitByMember[m._id] : 0;
            const parts = partInputs[m._id] ?? 0;
            const exactInvalid = fieldErrors.exactIds.includes(m._id);
            return (
              <View
                key={m._id}
                style={[styles.memberRow, { borderTopColor: colors.border }]}
              >
                <Pressable onPress={() => toggleIncluded(m._id)}>
                  <Check on={included} colors={colors} />
                </Pressable>
                <UserAvatar
                  name={memberListLabel(m, currentUserId, selfId)}
                  avatar={m.avatar || m.user?.avatar}
                  seed={m.userId || m._id}
                  size={28}
                />
                <Text
                  style={{ flex: 1, color: colors.text, fontWeight: "600" }}
                  numberOfLines={1}
                >
                  {memberListLabel(m, currentUserId, selfId)}
                </Text>
                {splitMethod === "EXACT" ? (
                  <TextInput
                    ref={(el) => {
                      exactInputRefs.current[m._id] = el;
                    }}
                    keyboardType="decimal-pad"
                    returnKeyType={
                      members[members.length - 1]?._id === m._id
                        ? "done"
                        : "next"
                    }
                    enterKeyHint={
                      members[members.length - 1]?._id === m._id
                        ? "done"
                        : "next"
                    }
                    blurOnSubmit={members[members.length - 1]?._id === m._id}
                    submitBehavior={
                      members[members.length - 1]?._id === m._id
                        ? "blurAndSubmit"
                        : "submit"
                    }
                    inputAccessoryViewID={iosAccessoryId}
                    onFocus={() => {
                      const isLast = members[members.length - 1]?._id === m._id;
                      setKeyboardAccessory(isLast ? "Done" : "Next", () =>
                        focusNextExact(m._id),
                      );
                    }}
                    onSubmitEditing={() => focusNextExact(m._id)}
                    value={exactInputs[m._id] ?? "0"}
                    onChangeText={(raw) => {
                      onExactAmountChange(m._id, raw);
                      setFieldErrors((prev) => ({
                        ...prev,
                        exactIds: prev.exactIds.filter((id) => id !== m._id),
                        included: false,
                      }));
                    }}
                    style={[
                      styles.exactInput,
                      {
                        color: colors.text,
                        borderColor: exactInvalid
                          ? colors.danger
                          : colors.border,
                        backgroundColor: colors.background,
                      },
                    ]}
                  />
                ) : null}
                {splitMethod === "SHARES" ? (
                  <View className="flex-row items-stretch gap-1.5">
                    <View className="items-end justify-center">
                      <Text
                        style={{
                          color: included ? colors.text : colors.textSecondary,
                          fontWeight: "600",
                          fontSize: 13,
                        }}
                      >
                        {formatMinor(share ?? 0, currency)}
                      </Text>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 11,
                          fontWeight: "600",
                          marginTop: 1,
                        }}
                      >
                        {parts}x
                      </Text>
                    </View>
                    <View
                      className="flex-row overflow-hidden"
                      style={[
                        styles.stepper,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.softSurface,
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => setParts(m._id, parts - 1)}
                        disabled={parts <= 0}
                        className="w-8 items-center justify-center"
                        style={{ opacity: parts <= 0 ? 0.35 : 1 }}
                      >
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 18,
                            fontWeight: "600",
                          }}
                        >
                          −
                        </Text>
                      </Pressable>
                      <View
                        style={{
                          width: StyleSheet.hairlineWidth,
                          backgroundColor: colors.border,
                        }}
                      />
                      <Pressable
                        onPress={() => setParts(m._id, parts + 1)}
                        disabled={parts >= 99}
                        className="w-8 items-center justify-center"
                        style={{ opacity: parts >= 99 ? 0.35 : 1 }}
                      >
                        <Text
                          style={{
                            color: colors.text,
                            fontSize: 18,
                            fontWeight: "600",
                          }}
                        >
                          +
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
                {splitMethod === "EQUAL" ? (
                  <Text
                    style={{
                      color: included ? colors.text : colors.textSecondary,
                      fontWeight: "600",
                    }}
                  >
                    {formatMinor(share ?? 0, currency)}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>

        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
        <PrimaryButton
          title={saving ? "Saving…" : isEdit ? "Save changes" : "Add expense"}
          loading={saving}
          onPress={onSubmit}
        />
      </ScrollView>

      <EmojiPickerModal
        open={iconsOpen}
        onClose={() => setIconsOpen(false)}
        value={icon}
        onSelect={(item) => {
          setIcon(item.emoji);
          setCategoryKey(item.categoryKey || categoryKeyForEmoji(item.emoji));
          setIconManual(true);
        }}
      />

      <Modal
        visible={payersOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPayersOpen(false)}
      >
        <View style={styles.sheetOverlay}>
          <Pressable
            style={[styles.sheetBackdrop, { backgroundColor: colors.overlay }]}
            onPress={() => setPayersOpen(false)}
          />
          <View
            style={[
              styles.sheet,
              {
                height: sheetHeight,
                backgroundColor: colors.elevated,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <View
              style={[styles.sheetHandle, { backgroundColor: colors.border }]}
            />
            <View style={styles.modalHead}>
              <Text
                style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}
              >
                Paid by
              </Text>
              <Pressable onPress={() => setPayersOpen(false)} hitSlop={8}>
                <Text
                  style={{ color: colors.textSecondary, fontWeight: "600" }}
                >
                  Cancel
                </Text>
              </Pressable>
            </View>
            <Text
              style={{
                color: colors.textSecondary,
                paddingHorizontal: 20,
                marginBottom: 8,
              }}
            >
              Select one or more people who paid.
            </Text>
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 16,
                paddingBottom: 12,
                gap: 4,
              }}
            >
              {members.map((m: GroupMember) => {
                const checked = draftPayerIds.includes(m._id);
                const amountInvalid = payerFieldErrors.includes(m._id);
                return (
                  <View
                    key={m._id}
                    style={[
                      styles.payerRow,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <Pressable
                      onPress={() => toggleDraftPayer(m._id)}
                      style={styles.payerLeft}
                    >
                      <Check on={checked} colors={colors} />
                      <UserAvatar
                        name={memberListLabel(m, currentUserId, selfId)}
                        avatar={m.avatar || m.user?.avatar}
                        seed={m.userId || m._id}
                        size={28}
                      />
                      <Text
                        style={{
                          color: colors.text,
                          fontWeight: "600",
                          flex: 1,
                        }}
                        numberOfLines={1}
                      >
                        {memberListLabel(m, currentUserId, selfId)}
                      </Text>
                    </Pressable>
                    {checked && draftPayerIds.length > 1 ? (
                      <TextInput
                        ref={(el) => {
                          payerInputRefs.current[m._id] = el;
                        }}
                        keyboardType="decimal-pad"
                        returnKeyType={
                          draftPayerIds[draftPayerIds.length - 1] === m._id
                            ? "done"
                            : "next"
                        }
                        enterKeyHint={
                          draftPayerIds[draftPayerIds.length - 1] === m._id
                            ? "done"
                            : "next"
                        }
                        submitBehavior={
                          draftPayerIds[draftPayerIds.length - 1] === m._id
                            ? "blurAndSubmit"
                            : "submit"
                        }
                        inputAccessoryViewID={iosAccessoryId}
                        onFocus={() => {
                          const isLast =
                            draftPayerIds[draftPayerIds.length - 1] === m._id;
                          setKeyboardAccessory(isLast ? "Done" : "Next", () =>
                            focusNextPayer(m._id),
                          );
                        }}
                        onSubmitEditing={() => focusNextPayer(m._id)}
                        value={
                          draftPayerAmounts[m._id] != null
                            ? (draftPayerAmounts[m._id] / 100).toString()
                            : ""
                        }
                        onChangeText={(raw) => {
                          const major = Number(raw);
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
                        style={[
                          styles.exactInput,
                          {
                            color: colors.text,
                            borderColor: amountInvalid
                              ? colors.danger
                              : colors.border,
                            backgroundColor: colors.surface,
                          },
                        ]}
                      />
                    ) : checked ? (
                      <Text style={{ color: colors.text, fontWeight: "600" }}>
                        {formatMinor(amountMinor, currency)}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </ScrollView>
            <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
              <Button className="w-full" onPress={savePayers}>
                <UIText>Done</UIText>
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={KEYBOARD_ACCESSORY_ID}>
          <View
            style={[
              styles.accessory,
              {
                backgroundColor: colors.elevated,
                borderTopColor: colors.border,
              },
            ]}
          >
            <Pressable
              onPress={() => keyboardAccessoryActionRef.current()}
              hitSlop={8}
              style={styles.accessoryBtn}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                {keyboardAccessoryLabel}
              </Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  amount: {
    height: 64,
    borderWidth: 1,
    borderRadius: 14,
    textAlign: "center",
    fontSize: 32,
    fontWeight: "700",
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  titleInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 16,
  },
  descHead: { flexDirection: "row", justifyContent: "space-between" },
  desc: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    textAlignVertical: "top",
  },
  metaRow: { flexDirection: "row", gap: 8 },
  metaBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  splitCard: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  splitHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  splitAll: { flexDirection: "row", alignItems: "center", gap: 8 },
  sheetOverlay: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 999,
    marginTop: 8,
    marginBottom: 4,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  exactInput: {
    width: 84,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    textAlign: "right",
    fontSize: 13,
  },
  stepper: {
    borderWidth: 1,
    borderRadius: 8,
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  payerRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  payerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  accessory: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  accessoryBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
});
