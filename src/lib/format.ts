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
 * The headings as the café prints them — "Not Coffee", not "Cold Drinks";
 * "Aqua", not "Water". The site used to invent its own two headings ("Coffee &
 * Espresso", "Food & Pastries"), so someone holding the printed menu was
 * reading a different document.
 */
export const CATEGORY_LABELS: Record<MenuCategoryKey, string> = {
  coffee: "Coffee",
  "not-coffee": "Not Coffee",
  aqua: "Aqua",
  sandwiches: "Sandwiches",
  desserts: "Desserts",
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
