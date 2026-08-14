import { CATEGORIES } from "@/shared/categories/index.js";

const GROUP_ALIASES = [
  {
    emoji: "👥",
    label: "Group",
    keywords: ["group", "friends", "team", "squad", "gang", "crew", "people"],
  },
  {
    emoji: "🏠",
    keywords: ["home", "house", "flat", "roommates", "pg", "rent", "apartment"],
  },
  {
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
    emoji: "🍽️",
    keywords: ["food", "dinner", "lunch", "restaurant", "meal", "eat"],
  },
  {
    emoji: "💼",
    label: "Work",
    keywords: ["work", "office", "job", "colleague", "company", "business"],
  },
  {
    emoji: "❤️",
    keywords: ["family", "wedding", "couple", "parents", "love"],
  },
  {
    emoji: "🎉",
    keywords: ["party", "birthday", "celebration", "fest", "new year"],
  },
  {
    emoji: "🚗",
    keywords: ["ride", "car", "drive", "taxi", "uber", "cab"],
  },
  {
    emoji: "🏔️",
    label: "Adventure",
    keywords: ["trek", "hiking", "adventure", "camp", "mountain", "hike"],
  },
  {
    emoji: "☕",
    keywords: ["cafe", "coffee", "chai"],
  },
  {
    emoji: "🎁",
    keywords: ["gift", "present", "surprise"],
  },
  {
    emoji: "💸",
    keywords: ["money", "budget", "expense", "split", "bills"],
  },
];

const EXTRA = [
  { emoji: "🍕", label: "Pizza", keywords: ["pizza"] },
  { emoji: "🍔", label: "Burger", keywords: ["burger", "hamburger"] },
  { emoji: "🍟", label: "Fries", keywords: ["fries", "chips"] },
  { emoji: "🌮", label: "Tacos", keywords: ["taco", "tacos"] },
  { emoji: "🍣", label: "Sushi", keywords: ["sushi", "japanese"] },
  { emoji: "🍜", label: "Noodles", keywords: ["noodles", "ramen"] },
  { emoji: "🍛", label: "Curry", keywords: ["curry", "biryani", "rice"] },
  { emoji: "☕", label: "Coffee", keywords: ["coffee", "cafe", "chai", "tea"] },
  { emoji: "🍺", label: "Drinks", keywords: ["beer", "drinks", "bar", "alcohol"] },
  { emoji: "🍷", label: "Wine", keywords: ["wine"] },
  { emoji: "🧃", label: "Juice", keywords: ["juice", "drink"] },
  { emoji: "🍦", label: "Ice cream", keywords: ["icecream", "dessert", "ice"] },
  { emoji: "🍪", label: "Snacks", keywords: ["cookie", "snack", "biscuit"] },
  { emoji: "🍎", label: "Fruit", keywords: ["fruit", "apple"] },
  {
    emoji: "🥗",
    label: "Salad",
    keywords: [
      "salad",
      "vegetable",
      "vegetables",
      "veggie",
      "veggies",
      "vege",
      "veg",
      "greens",
    ],
  },
  { emoji: "🥖", label: "Bread", keywords: ["bread", "bakery"] },
  { emoji: "🚕", label: "Taxi", keywords: ["taxi", "cab", "uber", "ola"] },
  { emoji: "🚌", label: "Bus", keywords: ["bus"] },
  { emoji: "🚇", label: "Metro", keywords: ["metro", "subway", "train"] },
  { emoji: "🏍️", label: "Bike", keywords: ["bike", "motorcycle", "rapido"] },
  { emoji: "⛽", label: "Fuel", keywords: ["fuel", "petrol", "diesel", "gas"] },
  { emoji: "🅿️", label: "Parking", keywords: ["parking"] },
  { emoji: "🚄", label: "Train", keywords: ["train", "rail"] },
  { emoji: "🚢", label: "Ship", keywords: ["ship", "cruise", "ferry"] },
  { emoji: "🧳", label: "Luggage", keywords: ["luggage", "bags", "suitcase"] },
  { emoji: "🏨", label: "Hotel", keywords: ["hotel", "stay", "airbnb"] },
  { emoji: "🗺️", label: "Map", keywords: ["map", "tour"] },
  { emoji: "🎮", label: "Games", keywords: ["game", "gaming", "playstation"] },
  { emoji: "🎵", label: "Music", keywords: ["music", "spotify", "song"] },
  { emoji: "🎧", label: "Headphones", keywords: ["headphones", "audio"] },
  { emoji: "🎤", label: "Karaoke", keywords: ["karaoke", "mic", "concert"] },
  { emoji: "🎟️", label: "Tickets", keywords: ["ticket", "tickets"] },
  { emoji: "🏟️", label: "Stadium", keywords: ["stadium", "match", "sports"] },
  { emoji: "🎉", label: "Party", keywords: ["party", "celebration", "fest"] },
  { emoji: "👗", label: "Clothes", keywords: ["clothes", "dress", "fashion"] },
  { emoji: "👟", label: "Shoes", keywords: ["shoes", "sneakers"] },
  { emoji: "⌚", label: "Watch", keywords: ["watch"] },
  { emoji: "📱", label: "Phone", keywords: ["phone", "mobile", "recharge"] },
  { emoji: "💻", label: "Laptop", keywords: ["laptop", "computer"] },
  { emoji: "🔑", label: "Keys", keywords: ["keys", "lock"] },
  { emoji: "🛋️", label: "Furniture", keywords: ["furniture", "sofa"] },
  { emoji: "🔧", label: "Repair", keywords: ["repair", "fix", "maintenance"] },
  { emoji: "🔌", label: "Electric", keywords: ["electric", "plug", "charger"] },
  { emoji: "📶", label: "Internet", keywords: ["wifi", "internet", "data"] },
  { emoji: "💧", label: "Water", keywords: ["water"] },
  { emoji: "🔥", label: "Gas", keywords: ["gas", "cylinder"] },
  { emoji: "🏥", label: "Hospital", keywords: ["hospital", "clinic"] },
  { emoji: "💪", label: "Gym", keywords: ["gym", "fitness", "workout"] },
  { emoji: "🧘", label: "Yoga", keywords: ["yoga", "wellness"] },
  { emoji: "🦷", label: "Dental", keywords: ["dental", "dentist", "teeth"] },
  { emoji: "🎀", label: "Gift wrap", keywords: ["wrap", "ribbon"] },
  { emoji: "🎂", label: "Cake", keywords: ["cake", "birthday"] },
  { emoji: "💐", label: "Flowers", keywords: ["flowers", "bouquet"] },
  { emoji: "✏️", label: "Stationery", keywords: ["pen", "stationery"] },
  { emoji: "🎓", label: "Education", keywords: ["college", "graduation", "fees"] },
  { emoji: "🧑‍💻", label: "Work", keywords: ["coding", "software", "wfh"] },
  { emoji: "⚽", label: "Football", keywords: ["football", "soccer"] },
  { emoji: "🏀", label: "Basketball", keywords: ["basketball"] },
  { emoji: "🎾", label: "Tennis", keywords: ["tennis"] },
  { emoji: "🐶", label: "Pet", keywords: ["dog", "pet", "puppy"] },
  { emoji: "🐱", label: "Cat", keywords: ["cat", "kitten"] },
  { emoji: "🌱", label: "Plants", keywords: ["plant", "garden"] },
  { emoji: "🧹", label: "Cleaning", keywords: ["clean", "cleaning", "maid"] },
  { emoji: "🧺", label: "Laundry", keywords: ["laundry", "wash"] },
  { emoji: "🧴", label: "Toiletries", keywords: ["soap", "shampoo", "toiletries"] },
  { emoji: "✂️", label: "Salon", keywords: ["salon", "haircut", "scissors"] },
  { emoji: "📦", label: "Delivery", keywords: ["delivery", "parcel", "package"] },
  { emoji: "📮", label: "Post", keywords: ["post", "mail"] },
  { emoji: "☎️", label: "Call", keywords: ["call", "phonebill"] },
  { emoji: "💸", label: "Money", keywords: ["money", "cash", "paid"] },
  { emoji: "💰", label: "Budget", keywords: ["budget", "savings"] },
  { emoji: "💵", label: "Cash", keywords: ["cash", "notes"] },
  { emoji: "💳", label: "Card", keywords: ["card", "credit", "debit"] },
  { emoji: "🏦", label: "Bank", keywords: ["bank", "emi", "loan"] },
  { emoji: "⭐", label: "Star", keywords: ["star", "favorite"] },
  { emoji: "❤️", label: "Family", keywords: ["love", "family", "heart"] },
  { emoji: "👍", label: "Ok", keywords: ["ok", "yes"] },
  { emoji: "⚠️", label: "Alert", keywords: ["alert", "warning"] },
];

function mergeIcon(list, item) {
  const keywords = (item.keywords || [])
    .map((k) => String(k).toLowerCase().trim())
    .filter(Boolean);
  const existing = list.find((row) => row.emoji === item.emoji);
  if (existing) {
    existing.keywords = [...new Set([...existing.keywords, ...keywords])];
    if (!existing.categoryKey && item.categoryKey) {
      existing.categoryKey = item.categoryKey;
    }
    if (item.label && existing.label === existing.emoji) {
      existing.label = item.label;
    }
    return;
  }
  list.push({
    emoji: item.emoji,
    label: item.label || item.emoji,
    categoryKey: item.categoryKey || "other",
    keywords,
  });
}

function buildCatalog() {
  const list = [];
  for (const c of CATEGORIES) {
    mergeIcon(list, {
      emoji: c.emoji,
      label: c.label,
      categoryKey: c.key,
      keywords: [c.label, c.key, ...(c.keywords || [])],
    });
  }
  for (const extra of EXTRA) mergeIcon(list, extra);
  for (const g of GROUP_ALIASES) mergeIcon(list, g);
  return list;
}

export const EMOJI_ICONS = buildCatalog();

export const DEFAULT_GROUP_EMOJI = "👥";

const DEFAULT_EMOJI =
  EMOJI_ICONS.find((i) => i.categoryKey === "other") || EMOJI_ICONS[0];

function scoreTerm(query, term) {
  const q = String(query).toLowerCase().trim();
  const k = String(term).toLowerCase().trim();
  if (!q || q.length < 2 || !k) return 0;
  if (k === q) return 100;
  if (k.startsWith(q)) return 80 + Math.min(q.length, 15);
  if (q.length >= 3 && k.includes(q)) return 55;
  if (k.length >= 3 && q.includes(k)) return 45;
  return 0;
}

/**
 * Best emoji for a typed name/title. Supports partial matches
 * ("vege" → vegetables). Returns a catalog item.
 */
export function suggestEmojiFromText(text = "", fallback = DEFAULT_EMOJI) {
  const raw = String(text).trim().toLowerCase();
  if (!raw) return { ...fallback };

  const collapsed = raw.replace(/[^a-z0-9]+/g, "");
  const tokens = raw.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
  const queries = [...new Set([raw, collapsed, ...tokens])];

  let best = fallback;
  let bestScore = 0;

  for (const icon of EMOJI_ICONS) {
    const terms = [icon.label, icon.categoryKey, ...(icon.keywords || [])];
    let score = 0;
    for (const q of queries) {
      for (const term of terms) {
        score = Math.max(score, scoreTerm(q, term));
      }
    }
    if (score > bestScore) {
      bestScore = score;
      best = icon;
    }
  }

  if (bestScore < 40) return { ...fallback };
  return { ...best };
}

export function getEmojiByValue(value) {
  if (!value) return { ...DEFAULT_EMOJI };
  return (
    EMOJI_ICONS.find((i) => i.emoji === value) || {
      emoji: value,
      label: "Icon",
      categoryKey: "other",
      keywords: [],
    }
  );
}
