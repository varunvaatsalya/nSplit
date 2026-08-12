/**
 * Local rule-based category / icon suggestion from expense title.
 * Extensible — replace mapping later without changing call sites.
 */

export const CATEGORIES = [
  { key: "food", label: "Food & Dining", icon: "utensils", keywords: ["dinner", "lunch", "breakfast", "food", "restaurant", "cafe", "coffee", "pizza", "meal"] },
  { key: "groceries", label: "Groceries", icon: "shopping-cart", keywords: ["grocery", "groceries", "supermarket", "market"] },
  { key: "transport", label: "Transport", icon: "car", keywords: ["uber", "ola", "taxi", "cab", "bus", "metro", "train", "fuel", "petrol", "parking"] },
  { key: "travel", label: "Travel", icon: "plane", keywords: ["flight", "hotel", "airbnb", "travel", "trip", "vacation"] },
  { key: "entertainment", label: "Entertainment", icon: "clapperboard", keywords: ["movie", "cinema", "netflix", "concert", "game", "party"] },
  { key: "shopping", label: "Shopping", icon: "bag", keywords: ["shopping", "amazon", "clothes", "mall"] },
  { key: "rent", label: "Rent & Housing", icon: "home", keywords: ["rent", "housing", "apartment", "maintenance"] },
  { key: "utilities", label: "Utilities", icon: "zap", keywords: ["electricity", "water", "internet", "wifi", "gas", "utility"] },
  { key: "health", label: "Health", icon: "heart", keywords: ["pharmacy", "doctor", "hospital", "medicine", "gym"] },
  { key: "refund", label: "Refund", icon: "rotate-ccw", keywords: ["refund", "cashback", "rebate"] },
  { key: "other", label: "Other", icon: "circle", keywords: [] },
];

const DEFAULT = CATEGORIES.find((c) => c.key === "other");

export function suggestCategoryFromTitle(title = "") {
  const normalized = String(title).trim().toLowerCase();
  if (!normalized) return { ...DEFAULT };

  for (const category of CATEGORIES) {
    if (category.key === "other") continue;
    for (const keyword of category.keywords) {
      if (normalized.includes(keyword) || keyword.includes(normalized)) {
        return { ...category };
      }
    }
  }
  return { ...DEFAULT };
}

export function getCategoryByKey(key) {
  return CATEGORIES.find((c) => c.key === key) || { ...DEFAULT };
}

export function listCategories() {
  return CATEGORIES.map((c) => ({ ...c }));
}
