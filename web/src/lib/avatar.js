/** Dark bg + white text. Large palette keeps collisions rare. */
export const AVATAR_PALETTE = [
  { bg: "#4338ca", fg: "#ffffff" },
  { bg: "#15803d", fg: "#ffffff" },
  { bg: "#b45309", fg: "#ffffff" },
  { bg: "#be185d", fg: "#ffffff" },
  { bg: "#0369a1", fg: "#ffffff" },
  { bg: "#7e22ce", fg: "#ffffff" },
  { bg: "#c2410c", fg: "#ffffff" },
  { bg: "#0f766e", fg: "#ffffff" },
  { bg: "#b91c1c", fg: "#ffffff" },
  { bg: "#4d7c0f", fg: "#ffffff" },
  { bg: "#334155", fg: "#ffffff" },
  { bg: "#a21caf", fg: "#ffffff" },
  { bg: "#1d4ed8", fg: "#ffffff" },
  { bg: "#047857", fg: "#ffffff" },
  { bg: "#a16207", fg: "#ffffff" },
  { bg: "#9f1239", fg: "#ffffff" },
  { bg: "#0e7490", fg: "#ffffff" },
  { bg: "#6d28d9", fg: "#ffffff" },
  { bg: "#9a3412", fg: "#ffffff" },
  { bg: "#115e59", fg: "#ffffff" },
  { bg: "#7f1d1d", fg: "#ffffff" },
  { bg: "#365314", fg: "#ffffff" },
  { bg: "#1e3a5f", fg: "#ffffff" },
  { bg: "#701a75", fg: "#ffffff" },
];

export function nameParts(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Candidate letter codes in priority order:
 * 1) Single letter (first char) - preferred when free
 * 2) First + last word (multi-word names, e.g. Varun Kumar Gupta → VG)
 * 3) First two chars of first word (Anurag → AN)
 * 4) First + second word (3+ words)
 * 5) First three chars of first word
 */
export function letterCandidates(name) {
  const parts = nameParts(name);
  if (!parts.length) return ["?"];

  const firstWord = parts[0];
  const first = firstWord[0].toUpperCase();
  const out = [];

  out.push(first);

  if (parts.length >= 2) {
    const last = parts[parts.length - 1][0].toUpperCase();
    out.push(`${first}${last}`);
  }

  if (firstWord.length >= 2) {
    out.push(firstWord.slice(0, 2).toUpperCase());
  }

  if (parts.length >= 3) {
    out.push(`${first}${parts[1][0].toUpperCase()}`);
  }

  if (firstWord.length >= 3) {
    out.push(firstWord.slice(0, 3).toUpperCase());
  }

  return [...new Set(out)];
}

/** Pick first candidate not already used (case-insensitive). */
export function pickLetters(name, usedLetters = []) {
  const used = new Set(
    [...usedLetters]
      .filter(Boolean)
      .map((l) => String(l).trim().toUpperCase())
  );
  for (const candidate of letterCandidates(name)) {
    if (!used.has(candidate)) return candidate;
  }

  const base = letterCandidates(name)[0] || "?";
  let n = 2;
  while (used.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

function normalizeHex(color) {
  if (!color || typeof color !== "string") return null;
  const c = color.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(c) ? c : null;
}

function shuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function pickAvatarBg(usedBgs = []) {
  const used = new Set(usedBgs.map(normalizeHex).filter(Boolean));
  const free = shuffle(
    AVATAR_PALETTE.filter((p) => !used.has(p.bg.toLowerCase()))
  );
  if (free.length) return free[0].bg;
  return AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)].bg;
}

export function resolveAvatarStyle(avatar, seed = "?") {
  const stored = normalizeHex(avatar?.bg);
  if (stored) {
    const match = AVATAR_PALETTE.find((p) => p.bg.toLowerCase() === stored);
    if (match) return match;
    return { bg: stored, fg: "#ffffff" };
  }
  let h = 0;
  const s = String(seed);
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

/** Normalized public avatar shape. */
export function publicAvatar(avatar, fallbackName = "") {
  const letters =
    (avatar?.letters && String(avatar.letters).trim().toUpperCase()) ||
    letterCandidates(fallbackName)[0] ||
    "?";
  return {
    url: avatar?.url ?? null,
    letters,
    bg: avatar?.bg ?? null,
  };
}

/** Build avatar from legacy flat fields if needed. */
export function coerceAvatar(source, fallbackName = "") {
  if (!source) {
    return { url: null, letters: null, bg: null };
  }
  if (source.avatar && typeof source.avatar === "object") {
    return {
      url: source.avatar.url ?? source.avatarUrl ?? null,
      letters: source.avatar.letters ?? null,
      bg: source.avatar.bg ?? source.avatarColor ?? null,
    };
  }
  return {
    url: source.avatarUrl ?? null,
    letters: null,
    bg: source.avatarColor ?? null,
  };
}
