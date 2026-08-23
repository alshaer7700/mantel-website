export type Page =
  | "home"
  | "menu"
  | "objects"
  | "story"
  | "contact"
  | "faq"
  | "privacy"
  | "terms"
  | "refund";

/*
 * The five headings on the printed menu, in the order they are printed. This
 * tuple is the single source of truth for the taxonomy: the DB check
 * constraint (supabase/006), the URL slugs (lib/routes) and the display labels
 * (lib/format) all key off these exact strings, so adding a section is one
 * edit here plus its label and a migration.
 *
 * "food" used to cover everything that wasn't coffee, which meant one heading
 * on the site stood in for three on the menu.
 */
export const MENU_CATEGORIES = [
  "coffee",
  "not-coffee",
  "aqua",
  "sandwiches",
  "desserts",
] as const;

export type MenuCategoryKey = (typeof MENU_CATEGORIES)[number];

/** A category, or null for "the whole menu". */
export type MenuCategory = MenuCategoryKey | null;

export type MenuItem = {
  id: string;
  name: string;
  desc: string;
  price: number;
  category: MenuCategoryKey;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  /*
   * Ingredients and nutrition are null until someone publishes them — null is
   * "no figure published", and must never be rendered as 0. Every consumer
   * checks for null rather than falsiness, because 0 g of fat is a real,
   * publishable value that a truthiness check would hide.
   */
  ingredients: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
};

