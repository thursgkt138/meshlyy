export type Category = "pantry" | "care" | "tech" | "home";
export type IllustrationKind = Category | "bread" | "cream" | "cable" | "notebook";

export const categories: { id: Category; name: string; note: string }[] = [
  { id: "pantry", name: "Daily pantry", note: "The good everyday." },
  { id: "care", name: "A little care", note: "Small rituals, nearby." },
  { id: "tech", name: "Useful things", note: "Back to connected." },
  { id: "home", name: "For your space", note: "Make yourself at home." },
];

export const stores = [
  { id: "grocer", name: "Common Ground", type: "Neighbourhood grocer", category: "pantry" as Category, street: "12 Market Lane", walk: "3 min", x: 23, y: 28 },
  { id: "care", name: "Kindred Care", type: "Everyday care", category: "care" as Category, street: "8 Garden Street", walk: "5 min", x: 73, y: 23 },
  { id: "tech", name: "Circuit Corner", type: "Tech & accessories", category: "tech" as Category, street: "21 Market Lane", walk: "4 min", x: 25, y: 74 },
  { id: "home", name: "Little Objects", type: "Home & stationery", category: "home" as Category, street: "6 Garden Street", walk: "6 min", x: 75, y: 70 },
];

export const products: { id: string; name: string; size: string; price: number; store: string; category: Category; art: IllustrationKind }[] = [
  { id: "milk", name: "Oat milk", size: "1 litre", price: 120, store: "grocer", category: "pantry", art: "pantry" },
  { id: "bread", name: "Sourdough loaf", size: "400 g", price: 180, store: "grocer", category: "pantry", art: "bread" },
  { id: "cleanser", name: "Gentle cleanser", size: "100 ml", price: 299, store: "care", category: "care", art: "care" },
  { id: "cream", name: "Hand cream", size: "50 ml", price: 160, store: "care", category: "care", art: "cream" },
  { id: "headphones", name: "Everyday headphones", size: "Wired · navy", price: 799, store: "tech", category: "tech", art: "tech" },
  { id: "cable", name: "USB-C cable", size: "1 metre", price: 249, store: "tech", category: "tech", art: "cable" },
  { id: "cup", name: "Everyday cup", size: "Ceramic · mint", price: 240, store: "home", category: "home", art: "home" },
  { id: "notebook", name: "Pocket notebook", size: "A6 · plain pages", price: 90, store: "home", category: "home", art: "notebook" },
];

export const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;
