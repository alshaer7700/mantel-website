import type { MenuCategoryKey } from "@/app/types";

/** With the currency, for anywhere a price appears on its own. */
export const formatBD = (n: number) => `BD ${n.toFixed(3)}`;

/**
 * Bare number, for the menu column. "BD" used to repeat on every row; it now
 * appears once, in a note at the top of the page. Three decimals because the
 * dinar divides into 1000 fils.
 */
export const formatPrice = (n: number) => n.toFixed(3);

/**
 * Section headings, in the site's own descriptive voice rather than the bare
 * words on the printed menu. "Coffee & Espresso" is the original label from
 * before the menu rebuild; the other four are written to match it, so all five
 * headings read as one set instead of one long label among four short ones.
 *
 * Note this is deliberately NOT the printed wording — the card says "Aqua" and
 * "Not Coffee". The sections and their order still match the card exactly; only
 * the words above them differ. If the two should be brought back into line,
 * this object is the only thing to change: the slugs, the DB constraint and the
 * routes all key off MENU_CATEGORIES, never off these strings.
 */
export const CATEGORY_LABELS: Record<MenuCategoryKey, string> = {
  coffee: "Coffee & Espresso",
  "not-coffee": "Matcha & Infusions",
  aqua: "Still & Sparkling",
  sandwiches: "Sandwiches & Panini",
  desserts: "Desserts & Pastries",
};

/**
 * Macros as one line: "8 g protein · 22 g carbs · 7.5 g fat".
 *
 * Null means the figure isn't published and the entry is dropped; 0 is a real
 * measurement and is kept, which is why this tests for null rather than
 * truthiness. Returns "" when nothing is published, so callers can skip the
 * row entirely instead of rendering an empty label.
 */
export const formatMacros = (item: {
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}): string =>
  (
    [
      [item.protein_g, "protein"],
      [item.carbs_g, "carbs"],
      [item.fat_g, "fat"],
    ] as const
  )
    .filter(([grams]) => grams !== null)
    .map(([grams, label]) => `${formatGrams(grams as number)} g ${label}`)
    .join(" · ");

/** 8 rather than 8.0, but 7.5 stays 7.5 — trailing zeros are noise in a list. */
const formatGrams = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
