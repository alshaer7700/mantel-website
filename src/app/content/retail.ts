import retailCandleSticksImage from "@/imports/retail-candle-sticks.png";
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
 * THE MOCKUPS ARE NOW CUT OUT (2026-09-16). They arrived on three different
 * grounds — white, two flat greys, and one painted wall — so the shelf read as
 * six unrelated photographs sitting in six coloured rectangles. Each file is
 * now a transparent PNG, trimmed to the object and re-centred on one square
 * canvas at a fixed margin, so --object-pad decides how large a product reads
 * rather than how loosely it happened to be framed.
 *
 * A replacement photograph has to meet the same two conditions, or it will
 * stand out from the rest: cut out on transparent PNG, and padded so the
 * object spans about the same fraction of its canvas as these do.
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
