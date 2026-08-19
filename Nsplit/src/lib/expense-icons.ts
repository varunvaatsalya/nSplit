export const CATEGORIES = [
  { key: 'food', label: 'Food & Dining', emoji: '🍽️', keywords: ['dinner', 'lunch', 'breakfast', 'food', 'restaurant', 'cafe', 'coffee', 'pizza', 'meal', 'biryani', 'chai', 'snack', 'burger'] },
  { key: 'groceries', label: 'Groceries', emoji: '🛒', keywords: ['grocery', 'groceries', 'supermarket', 'market', 'kirana', 'vegetables', 'veg'] },
  { key: 'transport', label: 'Transport', emoji: '🚗', keywords: ['uber', 'ola', 'taxi', 'cab', 'bus', 'metro', 'train', 'fuel', 'petrol', 'parking', 'auto'] },
  { key: 'travel', label: 'Travel', emoji: '✈️', keywords: ['flight', 'hotel', 'airbnb', 'travel', 'trip', 'vacation', 'holiday', 'goa', 'tour'] },
  { key: 'entertainment', label: 'Entertainment', emoji: '🎬', keywords: ['movie', 'cinema', 'netflix', 'concert', 'game', 'party'] },
  { key: 'shopping', label: 'Shopping', emoji: '🛍️', keywords: ['shopping', 'amazon', 'clothes', 'mall', 'flipkart'] },
  { key: 'rent', label: 'Rent & Housing', emoji: '🏠', keywords: ['rent', 'housing', 'apartment', 'maintenance', 'pg', 'flat'] },
  { key: 'utilities', label: 'Utilities', emoji: '💡', keywords: ['electricity', 'water', 'internet', 'wifi', 'gas', 'utility', 'recharge', 'bill'] },
  { key: 'health', label: 'Health', emoji: '💊', keywords: ['pharmacy', 'doctor', 'hospital', 'medicine', 'gym'] },
  { key: 'gifts', label: 'Gifts', emoji: '🎁', keywords: ['gift', 'present', 'birthday', 'anniversary'] },
  { key: 'education', label: 'Education', emoji: '📚', keywords: ['tuition', 'course', 'books', 'school', 'college', 'fees'] },
  { key: 'refund', label: 'Refund', emoji: '↩️', keywords: ['refund', 'cashback', 'rebate'] },
  { key: 'other', label: 'Other', emoji: '🧾', keywords: [] },
] as const;

const EXTRA_EMOJIS = [
  '🧾', '💸', '💰', '💵', '💳', '🏦', '🍽️', '🍕', '🍔', '🍟', '🌮', '🍣', '🍜', '🍛', '☕',
  '🍺', '🍷', '🧃', '🍦', '🍪', '🛒', '🍎', '🥗', '🥖', '🚗', '🚕', '🚌', '🚇', '🏍️', '⛽',
  '✈️', '🚄', '🚢', '🧳', '🏨', '🗺️', '🎬', '🎮', '🎵', '🎧', '🎤', '🎟️', '🏟️', '🎉',
  '🛍️', '👗', '👟', '⌚', '📱', '💻', '🏠', '🔑', '🛋️', '🔧', '💡', '🔌', '📶', '💧',
  '🔥', '💊', '🏥', '💪', '🧘', '🦷', '🎁', '🎀', '🎂', '💐', '📚', '✏️', '🎓', '⚽',
  '🏀', '🎾', '🐶', '🐱', '🌱', '🧹', '🧺', '🧴', '✂️', '📦', '📮', '☎️', '⭐', '❤️', '👍',
];

export type EmojiItem = { emoji: string; label: string; categoryKey: string | null };

export const EXPENSE_ICON_SECTIONS: { label: string; icons: EmojiItem[] }[] = [
  {
    label: 'Categories',
    icons: CATEGORIES.map((c) => ({
      emoji: c.emoji,
      label: c.label,
      categoryKey: c.key,
    })),
  },
  {
    label: 'More',
    icons: EXTRA_EMOJIS.filter(
      (emoji, i, arr) => arr.indexOf(emoji) === i && !CATEGORIES.some((c) => c.emoji === emoji)
    ).map((emoji) => ({ emoji, label: emoji, categoryKey: null })),
  },
];

const DEFAULT = CATEGORIES.find((c) => c.key === 'other')!;

export function categoryKeyForEmoji(emoji: string) {
  const match = CATEGORIES.find((c) => c.emoji === emoji);
  return match?.key || 'other';
}

export function suggestEmojiFromText(text = '') {
  const raw = String(text).trim().toLowerCase();
  if (!raw) return { emoji: DEFAULT.emoji, categoryKey: DEFAULT.key, label: DEFAULT.label };

  const collapsed = raw.replace(/[^a-z0-9]+/g, '');
  const tokens = raw.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
  const queries = [...new Set([raw, collapsed, ...tokens])];

  let best = DEFAULT;
  let bestScore = 0;

  for (const category of CATEGORIES) {
    if (category.key === 'other') continue;
    const terms = [category.label, category.key, ...category.keywords];
    let score = 0;
    for (const q of queries) {
      for (const term of terms) {
        const k = String(term).toLowerCase().trim();
        if (!q || q.length < 2 || !k) continue;
        let next = 0;
        if (k === q) next = 100;
        else if (k.startsWith(q)) next = 80 + Math.min(q.length, 15);
        else if (q.length >= 3 && k.includes(q)) next = 55;
        else if (k.length >= 3 && q.includes(k)) next = 45;
        if (next > score) score = next;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }

  if (bestScore < 40) return { emoji: DEFAULT.emoji, categoryKey: DEFAULT.key, label: DEFAULT.label };
  return { emoji: best.emoji, categoryKey: best.key, label: best.label };
}
