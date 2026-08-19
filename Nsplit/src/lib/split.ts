type Participant = { memberId: string; inputValue?: number | null };

function distributeByWeights(totalMinor: number, weights: number[]) {
  const n = weights.length;
  if (n === 0) return [];
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  if (sumWeights <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (totalMinor * w) / sumWeights);
  const floors = exact.map((v) => Math.floor(v));
  const remainder = totalMinor - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  const result = [...floors];
  for (let k = 0; k < remainder; k += 1) {
    result[order[k % n].i] += 1;
  }
  return result;
}

function distributeEqual(totalMinor: number, memberIds: string[]) {
  const sorted = [...memberIds].sort();
  const n = sorted.length;
  if (n === 0) return [];
  const base = Math.floor(totalMinor / n);
  let rem = totalMinor - base * n;
  return sorted.map((memberId) => {
    const extra = rem > 0 ? 1 : 0;
    if (rem > 0) rem -= 1;
    return { memberId, amountMinor: base + extra };
  });
}

export function calculateSplit({
  method,
  totalMinor,
  participants,
}: {
  method: string;
  totalMinor: number;
  participants: Participant[];
}) {
  const errors: string[] = [];
  if (!Number.isInteger(totalMinor) || totalMinor < 0) {
    errors.push('totalMinor must be a non-negative integer');
  }
  if (!Array.isArray(participants) || participants.length === 0) {
    errors.push('At least one participant is required');
  }
  const ids = new Set<string>();
  for (const p of participants || []) {
    if (!p?.memberId) errors.push('Each participant requires memberId');
    else if (ids.has(p.memberId)) errors.push(`Duplicate participant: ${p.memberId}`);
    else ids.add(p.memberId);
  }
  if (errors.length) return { valid: false, errors, splits: [] as { memberId: string; amountMinor: number; inputValue: number | null }[] };

  if (method === 'EQUAL') {
    const rows = distributeEqual(totalMinor, participants.map((p) => p.memberId));
    return {
      valid: true,
      errors: [],
      splits: rows.map((r) => ({ ...r, inputValue: null })),
    };
  }

  if (method === 'SHARES') {
    const weights = participants.map((p) => {
      const share = Number(p.inputValue);
      return Number.isFinite(share) && share >= 0 ? share : 0;
    });
    if (weights.every((w) => w === 0)) {
      return { valid: false, errors: ['Shares must sum to more than 0'], splits: [] };
    }
    const amounts = distributeByWeights(totalMinor, weights);
    return {
      valid: true,
      errors: [],
      splits: participants.map((p, i) => ({
        memberId: p.memberId,
        amountMinor: amounts[i],
        inputValue: Number(p.inputValue),
      })),
    };
  }

  if (method === 'EXACT' || method === 'CUSTOM') {
    const splits = [];
    let sum = 0;
    for (const p of participants) {
      const amount = Number(p.inputValue);
      if (!Number.isInteger(amount) || amount < 0) {
        return { valid: false, errors: [`Invalid ${method} amount for ${p.memberId}`], splits: [] };
      }
      sum += amount;
      splits.push({ memberId: p.memberId, amountMinor: amount, inputValue: amount });
    }
    if (sum !== totalMinor) {
      return {
        valid: false,
        errors: [`Sum of ${method} amounts (${sum}) must equal total (${totalMinor})`],
        splits: [],
      };
    }
    return { valid: true, errors: [], splits };
  }

  return { valid: false, errors: [`Unknown split method: ${method}`], splits: [] };
}

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
