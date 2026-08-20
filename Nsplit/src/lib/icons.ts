export const DEFAULT_GROUP_EMOJI = '👥';

export const GROUP_ICONS = [
  { key: 'users', emoji: '👥', keywords: ['group', 'friends', 'team', 'squad', 'gang', 'crew', 'people'] },
  { key: 'home', emoji: '🏠', keywords: ['home', 'house', 'flat', 'roommates', 'pg', 'rent', 'apartment'] },
  { key: 'plane', emoji: '✈️', keywords: ['trip', 'travel', 'flight', 'vacation', 'holiday', 'goa', 'manali', 'tour'] },
  { key: 'utensils', emoji: '🍽️', keywords: ['food', 'dinner', 'lunch', 'restaurant', 'meal', 'eat'] },
  { key: 'briefcase', emoji: '💼', keywords: ['work', 'office', 'job', 'colleague', 'company', 'business'] },
  { key: 'heart', emoji: '❤️', keywords: ['family', 'wedding', 'couple', 'parents', 'love'] },
  { key: 'party', emoji: '🎉', keywords: ['party', 'birthday', 'celebration', 'fest', 'new year'] },
  { key: 'car', emoji: '🚗', keywords: ['ride', 'car', 'drive', 'taxi', 'uber', 'cab'] },
  { key: 'mountain', emoji: '🏔️', keywords: ['trek', 'hiking', 'adventure', 'camp', 'mountain', 'hike'] },
  { key: 'coffee', emoji: '☕', keywords: ['cafe', 'coffee', 'chai'] },
  { key: 'gift', emoji: '🎁', keywords: ['gift', 'present', 'surprise'] },
  { key: 'wallet', emoji: '💸', keywords: ['money', 'budget', 'expense', 'split', 'bills'] },
] as const;

export const CURRENCIES = [
  { code: 'INR', label: '₹ Indian Rupee', flag: '🇮🇳' },
  { code: 'USD', label: '$ US Dollar', flag: '🇺🇸' },
  { code: 'EUR', label: '€ Euro', flag: '🇪🇺' },
  { code: 'GBP', label: '£ British Pound', flag: '🇬🇧' },
  { code: 'AED', label: 'د.إ UAE Dirham', flag: '🇦🇪' },
  { code: 'SGD', label: '$ Singapore Dollar', flag: '🇸🇬' },
  { code: 'AUD', label: '$ Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', label: '$ Canadian Dollar', flag: '🇨🇦' },
] as const;

const CATEGORY_EMOJI: Record<string, string> = {
  food: '🍽️',
  groceries: '🛒',
  transport: '🚗',
  travel: '✈️',
  entertainment: '🎬',
  shopping: '🛍️',
  rent: '🏠',
  utilities: '💡',
  health: '💊',
  gifts: '🎁',
  education: '📚',
  refund: '↩️',
  other: '🧾',
};

function looksLikeEmoji(value: string) {
  return !/^[a-z0-9_-]+$/i.test(value);
}

export function getGroupEmoji(keyOrEmoji?: string | null) {
  if (!keyOrEmoji) return DEFAULT_GROUP_EMOJI;
  const byKey = GROUP_ICONS.find((i) => i.key === keyOrEmoji);
  if (byKey) return byKey.emoji;
  const byEmoji = GROUP_ICONS.find((i) => i.emoji === keyOrEmoji);
  if (byEmoji) return byEmoji.emoji;
  if (looksLikeEmoji(keyOrEmoji)) return keyOrEmoji;
  return DEFAULT_GROUP_EMOJI;
}

export function suggestGroupEmojiFromName(name: string) {
  const raw = String(name || '').trim().toLowerCase();
  if (!raw) return DEFAULT_GROUP_EMOJI;
  const collapsed = raw.replace(/[^a-z0-9]+/g, '');
  const tokens = raw.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
  const queries = [...new Set([raw, collapsed, ...tokens])];

  let best = DEFAULT_GROUP_EMOJI;
  let bestScore = 0;
  for (const icon of GROUP_ICONS) {
    const terms = [icon.key, ...icon.keywords];
    let score = 0;
    for (const q of queries) {
      for (const term of terms) {
        const k = term.toLowerCase();
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
      best = icon.emoji;
    }
  }
  return bestScore >= 40 ? best : DEFAULT_GROUP_EMOJI;
}

export function getExpenseEmoji(iconOrEmoji?: string | null, categoryKey?: string | null) {
  if (iconOrEmoji && looksLikeEmoji(iconOrEmoji)) {
    return iconOrEmoji;
  }
  if (categoryKey && CATEGORY_EMOJI[categoryKey]) {
    return CATEGORY_EMOJI[categoryKey];
  }
  return '🧾';
}

export function canAddExpense(permission?: string | null) {
  return permission === 'ADD' || permission === 'EDIT' || permission === 'ADMIN';
}
