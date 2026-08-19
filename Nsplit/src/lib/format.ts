export function formatMinor(minor = 0, currency = 'INR') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format((Number(minor) || 0) / 100);
  } catch {
    return `${((Number(minor) || 0) / 100).toFixed(2)} ${currency}`;
  }
}

export function parseMajorToMinor(value: string) {
  const n = Number(String(value).replace(/,/g, '').trim());
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.round(n * 100);
}

export function dateHeaderLabel(date: Date) {
  if (Number.isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatRowTime(date: Date) {
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function memberName(member?: {
  displayName?: string | null;
  user?: { name?: string | null } | null;
} | null) {
  return member?.displayName || member?.user?.name || 'Member';
}
