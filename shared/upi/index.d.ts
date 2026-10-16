export function normalizeUpiId(value?: string | null): string;
export function isValidUpiId(value?: string | null): boolean;
export function buildUpiLink(params: {
  upiId: string;
  name?: string | null;
  /** Omit for a QR the payer fills in, like a person's own UPI QR. */
  amountMinor?: number | null;
  currency?: string;
  note?: string | null;
}): string;
