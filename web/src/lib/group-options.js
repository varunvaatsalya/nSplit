export const GROUP_ICONS = [
  { key: "users", label: "Group", emoji: "👥" },
  { key: "home", label: "Home", emoji: "🏠" },
  { key: "plane", label: "Trip", emoji: "✈️" },
  { key: "utensils", label: "Food", emoji: "🍽️" },
  { key: "briefcase", label: "Work", emoji: "💼" },
  { key: "heart", label: "Family", emoji: "❤️" },
  { key: "party", label: "Party", emoji: "🎉" },
  { key: "car", label: "Ride", emoji: "🚗" },
  { key: "mountain", label: "Adventure", emoji: "🏔️" },
  { key: "coffee", label: "Cafe", emoji: "☕" },
  { key: "gift", label: "Gift", emoji: "🎁" },
  { key: "wallet", label: "Money", emoji: "💸" },
];

export function getGroupIcon(key) {
  return GROUP_ICONS.find((i) => i.key === key) || GROUP_ICONS[0];
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
