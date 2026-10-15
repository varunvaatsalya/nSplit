export function normalizeUpiId(value?: string | null): string;
export function isValidUpiId(value?: string | null): boolean;
export function buildUpiLink(params: {
  upiId: string;
  name?: string | null;
  amountMinor: number;
  currency?: string;
  note?: string | null;
}): string;
