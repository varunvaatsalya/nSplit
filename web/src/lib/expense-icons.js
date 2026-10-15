import {
  CATEGORIES,
  getCategoryByKey,
  getDefaultExpenseCategory,
  matchCategory,
} from "@/shared/categories/index.js";

/** Extra picker emojis beyond category defaults */
const EXTRA_EMOJIS = [
  "🧾",
  "💸",
  "💰",
  "💵",
  "💳",
  "🏦",
  "🍽️",
  "🍕",
  "🍔",
  "🍟",
  "🌮",
  "🍣",
  "🍜",
  "🍛",
  "☕",
  "🍺",
  "🍷",
  "🧃",
  "🍦",
  "🍪",
  "🛒",
  "🍎",
  "🥗",
  "🥖",
  "🚗",
  "🚕",
  "🚌",
  "🚇",
  "🏍️",
  "⛽",
  "🅿️",
  "✈️",
  "🚄",
  "🚢",
  "🧳",
  "🏨",
  "🗺️",
  "🎬",
  "🎮",
  "🎵",
  "🎧",
  "🎤",
  "🎟️",
  "🏟️",
  "🎉",
  "🛍️",
  "👗",
  "👟",
  "⌚",
  "📱",
  "💻",
  "🏠",
  "🔑",
  "🛋️",
  "🔧",
  "💡",
  "🔌",
  "📶",
  "💧",
  "🔥",
  "💊",
  "🏥",
  "💪",
  "🧘",
  "🦷",
  "🎁",
  "🎀",
  "🎂",
  "💐",
  "📚",
  "✏️",
  "🎓",
  "🧑‍💻",
  "⚽",
  "🏀",
  "🎾",
  "🐶",
  "🐱",
  "🌱",
  "🧹",
  "🧺",
  "🧴",
  "✂️",
  "📦",
  "📮",
  "☎️",
  "🅿️",
  "⚠️",
  "⭐",
  "❤️",
  "👍",
];

export const EXPENSE_ICON_SECTIONS = [
  {
    label: "Categories",
    icons: CATEGORIES.map((c) => ({
      emoji: c.emoji,
      label: c.label,
      categoryKey: c.key,
    })),
  },
  {
    label: "More",
    icons: EXTRA_EMOJIS.filter(
      (emoji, i, arr) =>
        arr.indexOf(emoji) === i &&
        !CATEGORIES.some((c) => c.emoji === emoji)
    ).map((emoji) => ({ emoji, label: emoji, categoryKey: null })),
  },
];

export function getExpenseEmoji(iconOrEmoji, categoryKey) {
  if (iconOrEmoji && /\p{Extended_Pictographic}/u.test(iconOrEmoji)) {
    return iconOrEmoji;
  }
  if (categoryKey) {
    return getCategoryByKey(categoryKey).emoji;
  }
  if (iconOrEmoji) {
    const byIcon = CATEGORIES.find((c) => c.icon === iconOrEmoji);
    if (byIcon) return byIcon.emoji;
  }
  return getDefaultExpenseCategory().emoji;
}

export function categoryKeyForEmoji(emoji) {
  const match = CATEGORIES.find((c) => c.emoji === emoji);
  return match?.key || "other";
}

/** Icon picker sections, grouped by theme (same as the app). */
export const ICON_SECTIONS = [
  {
    label: "Food & drinks",
    emojis: ["🍽️", "🍕", "🍔", "🍟", "🌮", "🍣", "🍜", "🍛", "🥗", "🍰", "🍦", "🍪", "☕", "🧃", "🍺", "🍷", "🍹"],
  },
  {
    label: "Groceries & home",
    emojis: ["🛒", "🍎", "🥦", "🥛", "🥖", "🧺", "🧴", "🧹", "🏠", "🛋️", "🔑", "🔧"],
  },
  {
    label: "Travel & transport",
    emojis: ["🚗", "🚕", "🛺", "🚌", "🚇", "🚆", "🏍️", "⛽", "🅿️", "✈️", "🧳", "🏨", "🏖️", "🏔️", "🗺️", "🚢"],
  },
  {
    label: "Fun & shopping",
    emojis: ["🎬", "🎮", "🎵", "🎧", "🎤", "🎟️", "🎉", "🎳", "🛍️", "👗", "👟", "⌚", "📱", "💻"],
  },
  {
    label: "Bills & money",
    emojis: ["💡", "🔌", "📶", "💧", "🔥", "📺", "🧾", "💸", "💰", "💵", "💳", "🏦", "↩️"],
  },
  {
    label: "Health & people",
    emojis: ["💊", "🏥", "🦷", "💪", "🧘", "💇", "🎁", "🎂", "💐", "❤️", "🐶", "🐱", "👶"],
  },
  {
    label: "Study & work",
    emojis: ["📚", "✏️", "🎓", "🖨️", "💼", "📦", "📮", "⭐", "👍"],
  },
];

/** Category for an expense title, from the shared keyword engine. */
export function suggestCategory(title) {
  return matchCategory(title).category;
}
