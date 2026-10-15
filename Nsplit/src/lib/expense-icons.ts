import {
  CATEGORIES,
  getCategoryByKey,
  matchCategory,
  normalizeTitle,
  type Category,
  type CategoryKey,
} from '@nsplit/shared/categories';

export { CATEGORIES, getCategoryByKey, matchCategory, normalizeTitle };
export type { Category, CategoryKey };

export type EmojiItem = { emoji: string };

/** Icon picker sections, grouped by theme so people can scan for what they want. */
export const ICON_SECTIONS: { label: string; emojis: string[] }[] = [
  {
    label: 'Food & drinks',
    emojis: ['🍽️', '🍕', '🍔', '🍟', '🌮', '🍣', '🍜', '🍛', '🥗', '🍰', '🍦', '🍪', '☕', '🧃', '🍺', '🍷', '🍹'],
  },
  {
    label: 'Groceries & home',
    emojis: ['🛒', '🍎', '🥦', '🥛', '🥖', '🧺', '🧴', '🧹', '🏠', '🛋️', '🔑', '🔧'],
  },
  {
    label: 'Travel & transport',
    emojis: ['🚗', '🚕', '🛺', '🚌', '🚇', '🚆', '🏍️', '⛽', '🅿️', '✈️', '🧳', '🏨', '🏖️', '🏔️', '🗺️', '🚢'],
  },
  {
    label: 'Fun & shopping',
    emojis: ['🎬', '🎮', '🎵', '🎧', '🎤', '🎟️', '🎉', '🎳', '🛍️', '👗', '👟', '⌚', '📱', '💻'],
  },
  {
    label: 'Bills & money',
    emojis: ['💡', '🔌', '📶', '💧', '🔥', '📺', '🧾', '💸', '💰', '💵', '💳', '🏦', '↩️'],
  },
  {
    label: 'Health & people',
    emojis: ['💊', '🏥', '🦷', '💪', '🧘', '💇', '🎁', '🎂', '💐', '❤️', '🐶', '🐱', '👶'],
  },
  {
    label: 'Study & work',
    emojis: ['📚', '✏️', '🎓', '🖨️', '💼', '📦', '📮', '⭐', '👍'],
  },
];

/**
 * Category for a title: the user's own past choice for this exact title wins,
 * otherwise the shared keyword engine decides.
 */
export function suggestCategory(title: string, remembered?: Record<string, string>): Category {
  const hit = remembered?.[normalizeTitle(title)];
  if (hit) return getCategoryByKey(hit);
  return matchCategory(title).category;
}
