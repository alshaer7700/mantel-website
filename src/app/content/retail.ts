import retailCandleSticksImage from "@/imports/retail-candle-sticks.jpeg";
import coffeeCollageImage from "@/imports/mood-coffee-collage.jpg";
import retailLighterImage from "@/imports/retail-lighter.png";
import retailCandleImage from "@/imports/retail-candle.png";
import retailMatchaImage from "@/imports/retail-matcha.png";
import retailMatchSticksImage from "@/imports/retail-match-sticks.png";

/*
 * The shape a cart line needs, regardless of whether it came from the Retail
 * shelf or the Pick Up page: an id the sellables view recognises, a name and
 * a price. Image and tone are retail's color-blocked product photography —
 * café items on Pick Up have neither, so the cart and its line items render
 * without them rather than requiring a fake value.
 */
export type CartProduct = {
  id: string;
  /** Supabase sellables.id (a menu_items or objects row) used by place_order. */
  backendId?: string;
  name: string;
  price: number;
  image?: string | null;
  tone?: string;
};

export type RetailProduct = CartProduct & {
  description: string;
  image: string;
  tone: string;
};

export type CartLine = {
  product: CartProduct;
  quantity: number;
};

/*
 * ── THE REAL PRODUCT PHOTOGRAPHS ────────────────────────────────────────────
 *
 * The six images below are still the pre-launch mockups. Nayef has shot the
 * real objects (2026-09-15) — candle tins, two lighter colourways, the taper
 * candles with the heart band, the matches label, and two totes — but the files
 * have not reached the repository yet, so nothing here points at them.
 *
 * WHAT EACH ONE IS FOR, once the files are in src/imports/:
 *
 *   candles        the four stacked MANTEL tins
 *   lighters       the leopard-print lighter (the checkerboard one is a second
 *                  colourway — a nice second shot if the card ever takes two)
 *   candle-sticks  the pair of cream tapers in the corrugated heart band
 *   match-sticks   the MANTEL safety-matches label
 *   custom-bags    the "Mantel." tote (the red-heart tote is the other face)
 *   matcha-powder  STILL NEEDED — no photograph of it yet
 *
 * They must be cut out, on transparent PNG, and shot to a consistent object
 * size: every card frames its image identically now (see --object-pad in
 * margiela.css), so a product photographed larger in its own file will simply
 * read larger on the shelf. The originals are on brushed steel, so the
 * background has to come out or the tone block behind it is lost.
 *
 * Swapping one is two lines: add the import at the top of this file, and point
 * that product's `image` at it. Nothing else in the app needs to change.
 */
export const RETAIL_PRODUCTS: RetailProduct[] = [
  {
    id: "matcha-powder",
    name: "Matcha Powder",
    description: "Bright, clean, and quietly grassy.",
    price: 4.5,
    image: retailMatchaImage,
    tone: "matcha",
  },
  {
    id: "candles",
    name: "Candles",
    description: "A soft light for the end of the day.",
    price: 7,
    image: retailCandleImage,
    tone: "candle",
  },
  {
    id: "candle-sticks",
    name: "Candle Sticks",
    description: "For the shelf, the table, and the in-between.",
    price: 5.5,
    image: retailCandleSticksImage,
    tone: "sticks",
  },
  {
    id: "lighters",
    name: "Lighters",
    description: "A small object with a little ceremony.",
    price: 3,
    image: retailLighterImage,
    tone: "lighter",
  },
  {
    id: "match-sticks",
    name: "Match Sticks",
    description: "A little fire for the everyday ritual.",
    price: 2.5,
    image: retailMatchSticksImage,
    tone: "matches",
  },
  {
    id: "custom-bags",
    name: "Custom Bags",
    description: "Made for the things you take with you.",
    price: 6.5,
    image: coffeeCollageImage,
    tone: "bag",
  },
];

export function formatBhd(value: number): string {
  return `BD ${value.toFixed(3)}`;
}
