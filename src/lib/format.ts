/** With the currency, for anywhere a price appears on its own. */
export const formatBD = (n: number) => `BD ${n.toFixed(3)}`;

/**
 * Bare number, for the menu column. "BD" used to repeat on all fourteen rows;
 * it now appears once, in a note at the top of the page. Three decimals
 * because the dinar divides into 1000 fils.
 */
export const formatPrice = (n: number) => n.toFixed(3);

export const CATEGORY_LABELS: Record<"coffee" | "food", string> = {
  coffee: "Coffee & Espresso",
  food: "Food & Pastries",
};
