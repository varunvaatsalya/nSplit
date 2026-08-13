/**
 * Money helpers - all amounts in integer minor units (e.g. paise/cents).
 */

export function toMinor(major, fractionDigits = 2) {
  const factor = 10 ** fractionDigits;
  return Math.round(Number(major) * factor);
}

export function toMajor(minor, fractionDigits = 2) {
  const factor = 10 ** fractionDigits;
  return Number(minor) / factor;
}

export function formatMoney(minor, currency = "INR", fractionDigits = 2) {
  const major = toMajor(minor, fractionDigits);
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(major);
  } catch {
    return `${currency} ${major.toFixed(fractionDigits)}`;
  }
}

export function assertNonNegativeMinor(amountMinor, label = "amount") {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error(`${label} must be a non-negative integer (minor units)`);
  }
}
