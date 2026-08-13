/**
 * Largest-remainder (Hamilton) rounding so parts sum exactly to totalMinor.
 * @param {number} totalMinor
 * @param {number[]} weights - non-negative weights
 * @returns {number[]}
 */
export function distributeByWeights(totalMinor, weights) {
  if (!Number.isInteger(totalMinor) || totalMinor < 0) {
    throw new Error("totalMinor must be a non-negative integer");
  }
  const n = weights.length;
  if (n === 0) return [];

  const sumWeights = weights.reduce((a, b) => a + b, 0);
  if (sumWeights <= 0) {
    return weights.map(() => 0);
  }

  const exact = weights.map((w) => (totalMinor * w) / sumWeights);
  const floors = exact.map((v) => Math.floor(v));
  let remainder = totalMinor - floors.reduce((a, b) => a + b, 0);

  const order = exact
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);

  const result = [...floors];
  for (let k = 0; k < remainder; k += 1) {
    result[order[k % n].i] += 1;
  }
  return result;
}

/**
 * Equal split with stable remainder distribution by sorted memberId.
 */
export function distributeEqual(totalMinor, memberIds) {
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
