export const GROUP_ICONS = [
  {
    key: "users",
    label: "Group",
    emoji: "👥",
    keywords: ["group", "friends", "team", "squad", "gang", "crew"],
  },
  {
    key: "home",
    label: "Home",
    emoji: "🏠",
    keywords: ["home", "house", "flat", "apartment", "roommates", "pg", "rent"],
  },
  {
    key: "plane",
    label: "Trip",
    emoji: "✈️",
    keywords: [
      "trip",
      "travel",
      "flight",
      "vacation",
      "holiday",
      "goa",
      "manali",
      "tour",
    ],
  },
  {
    key: "utensils",
    label: "Food",
    emoji: "🍽️",
    keywords: ["food", "dinner", "lunch", "restaurant", "meal", "eat"],
  },
  {
    key: "briefcase",
    label: "Work",
    emoji: "💼",
    keywords: ["work", "office", "job", "colleague", "company", "business"],
  },
  {
    key: "heart",
    label: "Family",
    emoji: "❤️",
    keywords: ["family", "wedding", "couple", "parents"],
  },
  {
    key: "party",
    label: "Party",
    emoji: "🎉",
    keywords: ["party", "birthday", "celebration", "fest", "new year"],
  },
  {
    key: "car",
    label: "Ride",
    emoji: "🚗",
    keywords: ["ride", "car", "drive", "taxi", "uber", "cab"],
  },
  {
    key: "mountain",
    label: "Adventure",
    emoji: "🏔️",
    keywords: ["trek", "hiking", "adventure", "camp", "mountain"],
  },
  {
    key: "coffee",
    label: "Cafe",
    emoji: "☕",
    keywords: ["cafe", "coffee", "chai"],
  },
  {
    key: "gift",
    label: "Gift",
    emoji: "🎁",
    keywords: ["gift", "present", "surprise"],
  },
  {
    key: "wallet",
    label: "Money",
    emoji: "💸",
    keywords: ["money", "budget", "expense", "split", "bills"],
  },
];

const DEFAULT_ICON = GROUP_ICONS[0];

export function getGroupIcon(key) {
  return GROUP_ICONS.find((i) => i.key === key) || DEFAULT_ICON;
}

export function suggestGroupIconFromName(name = "") {
  const normalized = String(name).trim().toLowerCase();
  if (!normalized) return { ...DEFAULT_ICON };

  for (const icon of GROUP_ICONS) {
    for (const keyword of icon.keywords || []) {
      if (normalized.includes(keyword)) {
        return { ...icon };
      }
    }
  }
  return { ...DEFAULT_ICON };
}

export const CURRENCIES = [
  { code: "INR", label: "₹ Indian Rupee", symbol: "₹" },
  { code: "USD", label: "$ US Dollar", symbol: "$" },
  { code: "EUR", label: "€ Euro", symbol: "€" },
  { code: "GBP", label: "£ British Pound", symbol: "£" },
  { code: "AED", label: "د.إ UAE Dirham", symbol: "د.إ" },
  { code: "SGD", label: "$ Singapore Dollar", symbol: "S$" },
  { code: "AUD", label: "$ Australian Dollar", symbol: "A$" },
  { code: "CAD", label: "$ Canadian Dollar", symbol: "C$" },
];
