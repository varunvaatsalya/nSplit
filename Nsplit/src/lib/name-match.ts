export function normalizePersonName(value?: string | null) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const next = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    next[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      next[j] = Math.min(next[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j += 1) prev[j] = next[j];
  }
  return prev[b.length];
}

export const DEFAULT_NAME_MATCH_THRESHOLD = 0.72;

export function nameMatchScore(left?: string | null, right?: string | null) {
  const a = normalizePersonName(left);
  const b = normalizePersonName(right);
  if (!a || !b) return 0;
  if (a === b) return 1;

  if (a.includes(b) || b.includes(a)) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return 0.74 + 0.26 * ratio;
  }

  const tokensA = a.split(' ');
  const tokensB = new Set(b.split(' '));
  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1;
  }
  if (overlap > 0) {
    const tokenScore = overlap / Math.max(tokensA.length, tokensB.size);
    if (tokenScore >= 0.5) return 0.7 + 0.28 * tokenScore;
  }

  const maxLen = Math.max(a.length, b.length);
  const similarity = 1 - levenshtein(a, b) / maxLen;
  return similarity >= DEFAULT_NAME_MATCH_THRESHOLD ? similarity : 0;
}

export function findBestNameMatch<T>(
  items: T[],
  query?: string | null,
  getName?: (item: T) => string,
  threshold = DEFAULT_NAME_MATCH_THRESHOLD
): T | null {
  if (!query?.trim() || !items.length) return null;
  let best: T | null = null;
  let bestScore = 0;
  let second = 0;
  for (const item of items) {
    const score = nameMatchScore(query, getName ? getName(item) : String(item));
    if (score > bestScore) {
      second = bestScore;
      bestScore = score;
      best = item;
    } else if (score > second) {
      second = score;
    }
  }
  if (!best || bestScore < threshold) return null;
  if (bestScore < 1 && second > 0 && bestScore - second < 0.08) return null;
  return best;
}
