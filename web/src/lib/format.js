/** Money and date formatting shared by the group screens (mirrors the app's src/lib/format.ts). */

export function formatMinor(minor = 0, currency = "INR") {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format((Number(minor) || 0) / 100);
  } catch {
    return `${((Number(minor) || 0) / 100).toFixed(2)} ${currency}`;
  }
}

/** "+₹50.00" / "−₹50.00" / "₹0.00". */
export function formatSignedMinor(minor, currency = "INR") {
  if (minor > 0) return `+${formatMinor(minor, currency)}`;
  if (minor < 0) return `−${formatMinor(-minor, currency)}`;
  return formatMinor(0, currency);
}

/** Tailwind text color for a signed balance. */
export function toneClass(minor) {
  if (minor > 0) return "text-success";
  if (minor < 0) return "text-danger";
  return "text-muted";
}

export function parseDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function dateHeaderLabel(date) {
  if (!date || Number.isNaN(date.getTime())) return "Unknown date";
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startGiven = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startToday - startGiven) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  const weekday = date.toLocaleDateString("en-GB", { weekday: "short" });
  const rest = date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  return `${weekday}, ${rest}`;
}

export function formatRowTime(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatLongDate(value) {
  const date = parseDate(value);
  if (!date) return "";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDetailWhen(value) {
  const date = parseDate(value);
  if (!date) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function memberName(member) {
  return member?.displayName || member?.user?.name || "Member";
}
