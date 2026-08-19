const AVATAR_PALETTE = [
  '#4338ca',
  '#15803d',
  '#b45309',
  '#be185d',
  '#0369a1',
  '#7e22ce',
  '#c2410c',
  '#0f766e',
  '#b91c1c',
  '#4d7c0f',
  '#334155',
  '#a21caf',
  '#1d4ed8',
  '#047857',
  '#a16207',
  '#9f1239',
];

function nameParts(name: string) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function letterCandidates(name: string) {
  const parts = nameParts(name);
  if (!parts.length) return ['?'];
  const firstWord = parts[0];
  const first = firstWord[0].toUpperCase();
  const out = [first];
  if (parts.length >= 2) out.push(`${first}${parts[parts.length - 1][0].toUpperCase()}`);
  if (firstWord.length >= 2) out.push(firstWord.slice(0, 2).toUpperCase());
  return [...new Set(out)];
}

function pickLetters(name: string, usedLetters: string[]) {
  const used = new Set(usedLetters.filter(Boolean).map((l) => l.trim().toUpperCase()));
  for (const candidate of letterCandidates(name)) {
    if (!used.has(candidate)) return candidate;
  }
  const base = letterCandidates(name)[0] || '?';
  let n = 2;
  while (used.has(`${base}${n}`)) n += 1;
  return `${base}${n}`;
}

function pickAvatarBg(usedBgs: string[]) {
  const used = new Set(usedBgs.map((c) => c.toLowerCase()));
  const free = AVATAR_PALETTE.filter((bg) => !used.has(bg));
  if (free.length) return free[Math.floor(Math.random() * free.length)];
  return AVATAR_PALETTE[Math.floor(Math.random() * AVATAR_PALETTE.length)];
}

export function allocateMemberAvatar(
  name: string,
  used: { letters: string[]; bgs: string[] }
) {
  const letters = pickLetters(name, used.letters);
  const bg = pickAvatarBg(used.bgs);
  used.letters.push(letters);
  used.bgs.push(bg);
  return { url: null as string | null, letters, bg };
}
