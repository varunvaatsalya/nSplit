// Split engine lives in the shared package so app, web and server agree on every number.
export { calculateSplit, validatePayers } from '@nsplit/shared/split';

export function distributePayerAmounts(totalMinor: number, payerIds: string[]) {
  if (!payerIds.length) return {} as Record<string, number>;
  const base = Math.floor(totalMinor / payerIds.length);
  let rem = totalMinor - base * payerIds.length;
  const sorted = [...payerIds].sort();
  const map: Record<string, number> = {};
  for (const id of sorted) {
    const extra = rem > 0 ? 1 : 0;
    if (rem > 0) rem -= 1;
    map[id] = base + extra;
  }
  return map;
}
