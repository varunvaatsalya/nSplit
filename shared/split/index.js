import { distributeEqual, distributeByWeights } from "./rounding.js";

export const SplitMethod = {
  EQUAL: "EQUAL",
  EXACT: "EXACT",
  PERCENTAGE: "PERCENTAGE",
  SHARES: "SHARES",
  CUSTOM: "CUSTOM",
};

/**
 * @typedef {{ memberId: string, inputValue?: number|null }} ParticipantInput
 * @typedef {{ memberId: string, amountMinor: number, inputValue?: number|null }} SplitResult
 */

/**
 * Calculate expense splits. Pure domain — no React / DB.
 *
 * @param {{
 *   method: string,
 *   totalMinor: number,
 *   participants: ParticipantInput[]
 * }} params
 */
export function calculateSplit({ method, totalMinor, participants }) {
  const errors = [];

  if (!Number.isInteger(totalMinor) || totalMinor < 0) {
    errors.push("totalMinor must be a non-negative integer");
  }
  if (!Array.isArray(participants) || participants.length === 0) {
    errors.push("At least one participant is required");
  }

  const ids = new Set();
  for (const p of participants || []) {
    if (!p?.memberId) errors.push("Each participant requires memberId");
    else if (ids.has(p.memberId)) errors.push(`Duplicate participant: ${p.memberId}`);
    else ids.add(p.memberId);
  }

  if (errors.length) {
    return { valid: false, errors, splits: [] };
  }

  switch (method) {
    case SplitMethod.EQUAL:
      return wrap(distributeEqual(totalMinor, participants.map((p) => p.memberId)));
    case SplitMethod.EXACT:
    case SplitMethod.CUSTOM:
      return exactOrCustom(totalMinor, participants, method);
    case SplitMethod.PERCENTAGE:
      return percentage(totalMinor, participants);
    case SplitMethod.SHARES:
      return shares(totalMinor, participants);
    default:
      return { valid: false, errors: [`Unknown split method: ${method}`], splits: [] };
  }
}

function wrap(rows) {
  const splits = rows.map((r) => ({
    memberId: r.memberId,
    amountMinor: r.amountMinor,
    inputValue: null,
  }));
  return { valid: true, errors: [], splits, remainderDistributed: true };
}

function exactOrCustom(totalMinor, participants, method) {
  const errors = [];
  const splits = [];
  let sum = 0;

  for (const p of participants) {
    const amount = Number(p.inputValue);
    if (!Number.isInteger(amount) || amount < 0) {
      errors.push(`Invalid ${method} amount for ${p.memberId}`);
      continue;
    }
    sum += amount;
    splits.push({ memberId: p.memberId, amountMinor: amount, inputValue: amount });
  }

  if (errors.length) return { valid: false, errors, splits: [] };
  if (sum !== totalMinor) {
    return {
      valid: false,
      errors: [`Sum of ${method} amounts (${sum}) must equal total (${totalMinor})`],
      splits: [],
    };
  }
  return { valid: true, errors: [], splits, remainderDistributed: false };
}

function percentage(totalMinor, participants) {
  const errors = [];
  const weights = [];
  let pctSum = 0;

  for (const p of participants) {
    const pct = Number(p.inputValue);
    if (!Number.isFinite(pct) || pct < 0) {
      errors.push(`Invalid percentage for ${p.memberId}`);
      weights.push(0);
      continue;
    }
    pctSum += pct;
    weights.push(pct);
  }

  if (errors.length) return { valid: false, errors, splits: [] };

  // Allow tiny float drift around 100
  if (Math.abs(pctSum - 100) > 0.0001) {
    return {
      valid: false,
      errors: [`Percentages must sum to 100 (got ${pctSum})`],
      splits: [],
    };
  }

  const amounts = distributeByWeights(totalMinor, weights);
  const splits = participants.map((p, i) => ({
    memberId: p.memberId,
    amountMinor: amounts[i],
    inputValue: Number(p.inputValue),
  }));
  return { valid: true, errors: [], splits, remainderDistributed: true };
}

function shares(totalMinor, participants) {
  const errors = [];
  const weights = [];

  for (const p of participants) {
    const share = Number(p.inputValue);
    if (!Number.isFinite(share) || share < 0) {
      errors.push(`Invalid shares for ${p.memberId}`);
      weights.push(0);
      continue;
    }
    weights.push(share);
  }

  if (errors.length) return { valid: false, errors, splits: [] };
  if (weights.every((w) => w === 0)) {
    return { valid: false, errors: ["Shares must sum to more than 0"], splits: [] };
  }

  const amounts = distributeByWeights(totalMinor, weights);
  const splits = participants.map((p, i) => ({
    memberId: p.memberId,
    amountMinor: amounts[i],
    inputValue: Number(p.inputValue),
  }));
  return { valid: true, errors: [], splits, remainderDistributed: true };
}

/**
 * Validate multiple payers sum to expense total.
 */
export function validatePayers({ totalMinor, payers }) {
  const errors = [];
  if (!Number.isInteger(totalMinor) || totalMinor < 0) {
    errors.push("totalMinor must be a non-negative integer");
  }
  if (!Array.isArray(payers) || payers.length === 0) {
    errors.push("At least one payer is required");
  }

  const ids = new Set();
  let sum = 0;
  for (const p of payers || []) {
    if (!p?.memberId) errors.push("Each payer requires memberId");
    else if (ids.has(p.memberId)) errors.push(`Duplicate payer: ${p.memberId}`);
    else ids.add(p.memberId);

    if (!Number.isInteger(p?.amountMinor) || p.amountMinor < 0) {
      errors.push(`Invalid payer amount for ${p?.memberId ?? "?"}`);
    } else {
      sum += p.amountMinor;
    }
  }

  if (!errors.length && sum !== totalMinor) {
    errors.push(`Payer amounts (${sum}) must equal expense total (${totalMinor})`);
  }

  return { valid: errors.length === 0, errors, sum };
}
