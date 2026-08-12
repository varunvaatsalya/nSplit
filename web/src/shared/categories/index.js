/**
 * Local rule-based category / emoji suggestion from expense title.
 */

export const CATEGORIES = [
  {
    key: "food",
    label: "Food & Dining",
    icon: "utensils",
    emoji: "🍽️",
    keywords: [
      "dinner",
      "lunch",
      "breakfast",
      "food",
      "restaurant",
      "cafe",
      "coffee",
      "pizza",
      "meal",
      "biryani",
      "chai",
      "snack",
      "burger",
      "dinner",
      "khana",
    ],
  },
  {
    key: "groceries",
    label: "Groceries",
    icon: "shopping-cart",
    emoji: "🛒",
    keywords: [
      "grocery",
      "groceries",
      "supermarket",
      "market",
      "kirana",
      "vegetables",
      "sabzi",
    ],
  },
  {
    key: "transport",
    label: "Transport",
    icon: "car",
    emoji: "🚗",
    keywords: [
      "uber",
      "ola",
      "taxi",
      "cab",
      "bus",
      "metro",
      "train",
      "fuel",
      "petrol",
      "diesel",
      "parking",
      "auto",
      "rapido",
    ],
  },
  {
    key: "travel",
    label: "Travel",
    icon: "plane",
    emoji: "✈️",
    keywords: [
      "flight",
      "hotel",
      "airbnb",
      "travel",
      "trip",
      "vacation",
      "holiday",
      "booking",
    ],
  },
  {
    key: "entertainment",
    label: "Entertainment",
    icon: "clapperboard",
    emoji: "🎬",
    keywords: [
      "movie",
      "cinema",
      "netflix",
      "concert",
      "game",
      "party",
      "spotify",
      "show",
    ],
  },
  {
    key: "shopping",
    label: "Shopping",
    icon: "bag",
    emoji: "🛍️",
    keywords: [
      "shopping",
      "amazon",
      "clothes",
      "mall",
      "flipkart",
      "myntra",
      "shoes",
    ],
  },
  {
    key: "rent",
    label: "Rent & Housing",
    icon: "home",
    emoji: "🏠",
    keywords: ["rent", "housing", "apartment", "maintenance", "pg", "deposit"],
  },
  {
    key: "utilities",
    label: "Utilities",
    icon: "zap",
    emoji: "💡",
    keywords: [
      "electricity",
      "water",
      "internet",
      "wifi",
      "gas",
      "utility",
      "recharge",
      "bill",
    ],
  },
  {
    key: "health",
    label: "Health",
    icon: "heart",
    emoji: "💊",
    keywords: [
      "pharmacy",
      "doctor",
      "hospital",
      "medicine",
      "gym",
      "clinic",
      "dental",
    ],
  },
  {
    key: "gifts",
    label: "Gifts",
    icon: "gift",
    emoji: "🎁",
    keywords: ["gift", "present", "birthday", "anniversary"],
  },
  {
    key: "education",
    label: "Education",
    icon: "book",
    emoji: "📚",
    keywords: ["tuition", "course", "books", "school", "college", "fees"],
  },
  {
    key: "refund",
    label: "Refund",
    icon: "rotate-ccw",
    emoji: "↩️",
    keywords: ["refund", "cashback", "rebate"],
  },
  {
    key: "other",
    label: "Other",
    icon: "receipt",
    emoji: "🧾",
    keywords: [],
  },
];

const DEFAULT = CATEGORIES.find((c) => c.key === "other");

export function suggestCategoryFromTitle(title = "") {
  const normalized = String(title).trim().toLowerCase();
  if (!normalized) return { ...DEFAULT };

  for (const category of CATEGORIES) {
    if (category.key === "other") continue;
    for (const keyword of category.keywords) {
      if (normalized.includes(keyword)) {
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

export function getDefaultExpenseCategory() {
  return { ...DEFAULT };
}
