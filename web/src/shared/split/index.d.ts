export const SplitMethod: {
  EQUAL: 'EQUAL';
  EXACT: 'EXACT';
  PERCENTAGE: 'PERCENTAGE';
  SHARES: 'SHARES';
  CUSTOM: 'CUSTOM';
};

export type SplitRow = { memberId: string; amountMinor: number; inputValue: number | null };

export function calculateSplit(params: {
  method: string;
  totalMinor: number;
  participants: { memberId: string; inputValue?: number | null }[];
}): { valid: boolean; errors: string[]; splits: SplitRow[]; remainderDistributed?: boolean };

export function validatePayers(params: {
  totalMinor: number;
  payers: { memberId: string; amountMinor: number }[];
}): { valid: boolean; errors: string[]; sum: number };
