/**
 * Expense categories + rule-based category suggestion from an expense title.
 *
 * Single source of truth for app and web. Matching is whole-word (so "Vegas"
 * never hits "gas"), supports multi-word phrases ("movie ticket"), plurals,
 * and prefix matches on the word being typed ("swig" -> Swiggy).
 */

export const CATEGORIES = [
  {
    key: "food",
    label: "Food & Dining",
    icon: "utensils",
    emoji: "🍽️",
    keywords: [
      "food", "dinner", "lunch", "breakfast", "brunch", "meal", "restaurant", "cafe", "coffee",
      "tea", "chai", "snack", "snacks", "pizza", "burger", "biryani", "dosa", "momos", "thali",
      "paratha", "maggi", "sandwich", "noodles", "dessert", "ice cream", "cake", "bakery",
      "juice", "drinks", "beer", "bar", "pub", "dhaba", "canteen", "mess", "tiffin", "khana",
      "nashta", "swiggy", "zomato", "dominos", "mcdonalds", "kfc", "starbucks", "takeaway",
      "eat", "eating", "treat", "roti", "naan", "kulcha", "samosa", "pakoda", "pakora", "chaat",
      "golgappa", "pani puri", "panipuri", "vada pav", "pav bhaji", "idli", "chole", "bhature",
      "rajma", "tikka", "kebab", "shawarma", "roll", "frankie", "lassi", "mithai", "sweets",
      "jalebi", "namkeen", "chips", "dinner party",
    ],
  },
  {
    key: "groceries",
    label: "Groceries",
    icon: "shopping-cart",
    emoji: "🛒",
    keywords: [
      "grocery", "groceries", "supermarket", "kirana", "vegetables", "vegetable", "veggies",
      "sabzi", "fruits", "fruit", "milk", "doodh", "eggs", "bread", "atta", "rice", "dal",
      "ration", "blinkit", "zepto", "instamart", "bigbasket", "dmart", "jiomart", "household",
      "toiletries", "detergent", "soap", "shampoo", "toothpaste",
      "subzi", "tomato", "tamatar", "potato", "aloo", "onion", "pyaz", "garlic", "lahsun",
      "ginger", "adrak", "dhaniya", "coriander", "mirchi", "chilli", "lemon", "nimbu", "palak",
      "spinach", "gobhi", "cauliflower", "cabbage", "bhindi", "matar", "peas", "carrot", "gajar",
      "cucumber", "kheera", "banana", "kela", "apple", "seb", "mango", "aam", "grapes", "angoor",
      "oil", "tel", "ghee", "sugar", "cheeni", "namak", "salt", "masala", "haldi", "paneer",
      "curd", "dahi", "butter", "makhan", "cheese", "chawal", "besan", "maida", "poha", "suji",
      "flour", "cereal", "biscuit", "anda",
    ],
  },
  {
    key: "transport",
    label: "Transport",
    icon: "car",
    emoji: "🚗",
    keywords: [
      "uber", "ola", "rapido", "taxi", "cab", "auto", "rickshaw", "bus", "metro", "local train",
      "fuel", "petrol", "diesel", "cng", "parking", "toll", "fastag", "ride", "bike", "scooty",
      "car wash", "commute",
    ],
  },
  {
    key: "travel",
    label: "Travel",
    icon: "plane",
    emoji: "✈️",
    keywords: [
      "travel", "trip", "flight", "airport", "train", "irctc", "hotel", "hostel", "airbnb",
      "oyo", "resort", "stay", "booking", "makemytrip", "goibibo", "vacation", "holiday", "tour",
      "trek", "visa", "luggage", "goa", "manali", "ladakh", "kasol", "rishikesh", "jaipur",
      "kerala",
    ],
  },
  {
    key: "entertainment",
    label: "Entertainment",
    icon: "clapperboard",
    emoji: "🎬",
    keywords: [
      "movie", "movies", "cinema", "pvr", "inox", "bookmyshow", "concert", "show", "event",
      "party", "club", "game", "gaming", "bowling", "netflix", "prime", "hotstar", "spotify",
      "youtube premium", "subscription", "tickets", "ticket", "fun", "picnic",
    ],
  },
  {
    key: "shopping",
    label: "Shopping",
    icon: "bag",
    emoji: "🛍️",
    keywords: [
      "shopping", "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "mall", "clothes",
      "shirt", "tshirt", "jeans", "shoes", "dress", "kurta", "watch", "electronics", "phone",
      "laptop", "headphones", "accessories", "decor", "furniture",
    ],
  },
  {
    key: "rent",
    label: "Rent & Housing",
    icon: "home",
    emoji: "🏠",
    keywords: [
      "rent", "housing", "house", "home", "flat", "apartment", "pg", "hostel rent", "room",
      "deposit", "maintenance", "society", "broker", "brokerage", "repair", "plumber",
      "electrician", "cleaning", "maid", "cook", "roommates", "shifting", "movers",
    ],
  },
  {
    key: "utilities",
    label: "Utilities",
    icon: "zap",
    emoji: "💡",
    keywords: [
      "electricity", "electric", "power", "light bill", "water", "internet", "wifi", "broadband",
      "gas", "cylinder", "lpg", "utility", "utilities", "recharge", "mobile", "postpaid",
      "prepaid", "jio", "airtel", "vi", "bsnl", "dth", "bill", "bills",
    ],
  },
  {
    key: "health",
    label: "Health",
    icon: "heart",
    emoji: "💊",
    keywords: [
      "health", "doctor", "hospital", "clinic", "medicine", "medicines", "pharmacy", "chemist",
      "medical", "dental", "dentist", "checkup", "lab", "gym", "fitness", "yoga",
      "salon", "haircut", "spa", "apollo", "pharmeasy", "1mg",
    ],
  },
  {
    key: "gifts",
    label: "Gifts",
    icon: "gift",
    emoji: "🎁",
    keywords: [
      "gift", "gifts", "present", "birthday", "bday", "anniversary", "wedding", "shagun",
      "farewell", "celebration", "flowers", "bouquet", "donation", "charity",
    ],
  },
  {
    key: "education",
    label: "Education",
    icon: "book",
    emoji: "📚",
    keywords: [
      "education", "tuition", "coaching", "course", "class", "classes", "books", "book",
      "stationery", "school", "college", "university", "fees", "exam", "udemy", "coursera",
      "notes", "printout", "xerox",
    ],
  },
  {
    key: "refund",
    label: "Refund",
    icon: "rotate-ccw",
    emoji: "↩️",
    // A refund "for dinner" is still a refund, so it wins ties.
    priority: 20,
    keywords: ["refund", "refunded", "cashback", "rebate", "reimbursement"],
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

/** Minimum score for a suggestion; below this the title stays "Other". */
const MIN_SCORE = 50;

export function normalizeTitle(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Plural → singular: "tomatoes" / "tomatos" → "tomato", "batteries" → "battery". */
function singular(word) {
  if (word.length <= 3 || word.endsWith("ss")) return word;
  if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
  if (/(oes|ches|shes|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s")) return word.slice(0, -1);
  return word;
}

/**
 * Sound-alike key so Hinglish spellings meet: sabzi/sabji/subji, khaana/khana,
 * dhaniya/dhania, chawal/chaval. Applied to both keywords and the title.
 */
function phonetic(word) {
  return singular(word)
    .replace(/ph/g, "f")
    .replace(/ck|q/g, "k")
    .replace(/z/g, "j")
    .replace(/w/g, "v")
    .replace(/ee|ea|y$/g, "i")
    .replace(/oo|ou/g, "u")
    .replace(/iy/g, "i")
    .replace(/u(?=[bj])/g, "a")
    .replace(/(.)\1+/g, "$1");
}

/** True when a and b differ by at most one insert, delete or substitution. */
function withinOneEdit(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const INDEX = CATEGORIES.filter((c) => c.key !== "other").map((category) => ({
  category,
  phrases: [category.key, ...category.keywords].map((k) => {
    const norm = normalizeTitle(k);
    return {
      norm,
      words: norm.split(" "),
      collapsed: norm.replace(/ /g, ""),
      stem: singular(norm),
      sound: phonetic(norm),
    };
  }),
}));

function scorePhrase(phrase, ctx) {
  if (phrase.words.length > 1) {
    if (ctx.padded.includes(` ${phrase.norm} `)) return 110;
    if (phrase.collapsed.length >= 4 && ctx.collapsed === phrase.collapsed) return 100;
    return 0;
  }
  const word = phrase.norm;
  if (ctx.words.has(word) || ctx.words.has(phrase.stem)) return 100;
  // "d mart" / "dmart"
  if (word.length >= 4 && ctx.collapsed === word) return 100;
  // Hinglish spelling variants: "sabji" for "sabzi".
  if (phrase.sound.length >= 3 && ctx.sounds.has(phrase.sound)) return 95;
  // One-letter typos on longer words ("grocries"); the first letter must match so "mouse" is not "house".
  if (phrase.stem.length >= 5 && ctx.stems.some((t) => t.length >= 5 && t[0] === phrase.stem[0] && withinOneEdit(t, phrase.stem))) {
    return 85;
  }
  // Word still being typed: "swig" -> "swiggy".
  if (ctx.last.length >= 3 && word.length > ctx.last.length && word.startsWith(ctx.last)) {
    return 50 + Math.min(ctx.last.length, 15);
  }
  return 0;
}

/** Best category for a title plus its score (0 when nothing matched). */
export function matchCategory(title = "") {
  const norm = normalizeTitle(title);
  if (!norm) return { category: { ...DEFAULT }, score: 0 };

  const tokens = norm.split(" ");
  const stems = tokens.map(singular);
  const ctx = {
    padded: ` ${norm} `,
    collapsed: norm.replace(/ /g, ""),
    words: new Set([...tokens, ...stems]),
    stems,
    sounds: new Set(tokens.filter((t) => t.length >= 3).map(phonetic)),
    last: tokens[tokens.length - 1],
  };

  let best = DEFAULT;
  let bestScore = 0;
  for (const { category, phrases } of INDEX) {
    let top = 0;
    // Distinct matched words ("bill" and "bills" count once).
    const hits = new Set();
    for (const phrase of phrases) {
      const s = scorePhrase(phrase, ctx);
      if (s >= 100) hits.add(singular(phrase.norm));
      if (s > top) top = s;
    }
    if (!top) continue;
    // Extra matching words add confidence; priority settles intent ties.
    const score = top + Math.max(0, hits.size - 1) * 5 + (category.priority || 0);
    if (score > bestScore) {
      bestScore = score;
      best = category;
    }
  }

  if (bestScore < MIN_SCORE) return { category: { ...DEFAULT }, score: 0 };
  return { category: { ...best }, score: bestScore };
}

export function suggestCategoryFromTitle(title = "") {
  return matchCategory(title).category;
}

export function getCategoryByKey(key) {
  return { ...(CATEGORIES.find((c) => c.key === key) || DEFAULT) };
}

export function listCategories() {
  return CATEGORIES.map((c) => ({ ...c }));
}

export function getDefaultExpenseCategory() {
  return { ...DEFAULT };
}
