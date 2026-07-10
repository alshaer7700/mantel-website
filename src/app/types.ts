export type Page =
  | "home"
  | "menu"
  | "order"
  | "contact"
  | "faq"
  | "privacy"
  | "terms"
  | "refund";
export type MenuCategory = "coffee" | "food" | null;

export type MenuItem = {
  id: string;
  name: string;
  desc: string;
  price: number;
  category: "coffee" | "food";
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
};

export type CartItem = { id: string; name: string; price: number; qty: number };

export type Profile = { name: string; email: string };
