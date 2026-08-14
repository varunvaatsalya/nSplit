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
      "vegetable",
      "veggie",
      "veggies",
      "vege",
      "veg",
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
      "goa",
      "manali",
      "tour",
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
    keywords: [
      "rent",
      "housing",
      "apartment",
      "maintenance",
      "pg",
      "deposit",
      "home",
      "house",
      "flat",
      "roommates",
    ],
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

  const collapsed = normalized.replace(/[^a-z0-9]+/g, "");
  const tokens = normalized.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
  const queries = [...new Set([normalized, collapsed, ...tokens])];

  let best = DEFAULT;
  let bestScore = 0;

  for (const category of CATEGORIES) {
    if (category.key === "other") continue;
    const terms = [category.label, category.key, ...(category.keywords || [])];
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

  if (bestScore < 40) return { ...DEFAULT };
  return { ...best };
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
