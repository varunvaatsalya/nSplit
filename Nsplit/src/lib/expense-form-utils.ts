import { distributePayerAmounts } from './split';

export const SPLIT_METHODS = [
  { value: 'EQUAL', label: 'Equally' },
  { value: 'EXACT', label: 'As amount' },
  { value: 'SHARES', label: 'As parts' },
] as const;

export type SplitMethodValue = (typeof SPLIT_METHODS)[number]['value'];

export function normalizeSplitMethod(value?: string | null): SplitMethodValue {
  return value === 'EQUAL' || value === 'EXACT' || value === 'SHARES' ? value : 'EQUAL';
}

export function defaultParts(memberIds: string[]) {
  const map: Record<string, number> = {};
  for (const id of memberIds) map[id] = 1;
  return map;
}

export function resolveGroupSplitDefaults(
  group: {
    settings?: {
      defaultSplitMethod?: string | null;
      defaultSplitConfig?: { memberId?: string; value?: number }[] | null;
    } | null;
  } | null,
  memberIds: string[]
) {
  const method = normalizeSplitMethod(group?.settings?.defaultSplitMethod);
  const parts = defaultParts(memberIds);
  if (method === 'SHARES') {
    const config = group?.settings?.defaultSplitConfig;
    if (Array.isArray(config)) {
      const idSet = new Set(memberIds.map(String));
      for (const row of config) {
        const mid = row?.memberId != null ? String(row.memberId) : '';
        if (!mid || !idSet.has(mid)) continue;
        const n = Number(row.value);
        parts[mid] = Number.isFinite(n) && n >= 1 ? Math.min(99, Math.round(n)) : 1;
      }
    }
  }
  return { method, parts };
}

export function parseMajorToMinor(value: string | number | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export function minorToExactInput(minor: number) {
  if (!minor || minor <= 0) return '0';
  return (minor / 100).toString();
}

export function exactMapFromTotal(memberIds: string[], totalMinor: number) {
  const dist = distributePayerAmounts(Math.max(0, totalMinor || 0), memberIds);
  const map: Record<string, string> = {};
  for (const id of memberIds) map[id] = minorToExactInput(dist[id] || 0);
  return map;
}

export function includedFromExactMap(memberIds: string[], exactMap: Record<string, string>) {
  return memberIds.filter((id) => parseMajorToMinor(exactMap[id]) > 0);
}

export function waterfallExact(
  memberIds: string[],
  editedId: string,
  typedMinor: number,
  totalMinor: number,
  prevInputs: Record<string, string>
) {
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

export function toLocalDateValue(date: Date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function toLocalTimeValue(date: Date) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function combineDateTime(dateStr: string, timeStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr || '00:00').split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

export function formatWhenLabel(date: Date) {
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (sameDay) return `Today · ${time}`;
  return `${date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  })} · ${time}`;
}
