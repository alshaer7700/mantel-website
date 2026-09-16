import retailCandleSticksImage from "@/imports/retail-candle-sticks.webp";
import retailToteImage from "@/imports/retail-tote.webp";
import retailToteHeartImage from "@/imports/retail-tote-heart.webp";
import retailLighterImage from "@/imports/retail-lighter.webp";
import retailLighterCheckImage from "@/imports/retail-lighter-check.webp";
import retailCandleImage from "@/imports/retail-candle.webp";
import retailMatchaImage from "@/imports/retail-matcha.webp";
import retailMatchSticksImage from "@/imports/retail-match-sticks.webp";

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
  /** The face the cart and every other surface shows. */
  image: string;
  /*
   * Every face of the product, in the order the card steps through them, when
   * there is more than one. The tote is printed on both sides and a shelf that
   * shows one of them is selling half the bag. `image` stays the first entry:
   * the cart line, and anything else that wants a single picture, reads that
   * and never has to know a product has more than one.
   */
  images?: readonly string[];
  tone: string;
};

export type CartLine = {
  product: CartProduct;
  quantity: number;
};

/*
 * ── THE PRODUCT PHOTOGRAPHS ─────────────────────────────────────────────────
 *
 * Five of the six are the real objects, shot 2026-09-15 and in the tree since
 * 2026-09-16:
 *
 *   candles        the four stacked MANTEL tins
 *   lighters       both colourways, leopard then checkerboard — one card,
 *                  stepped through by ObjectSlides
 *   candle-sticks  the pair of cream tapers in the corrugated heart band
 *   match-sticks   the MANTEL safety-matches label
 *   custom-bags    the "Mantel." tote and its red-heart face, also two
 *
 * matcha-powder is the exception and still a pre-launch mockup: no photograph
 * of it has been taken.
 *
 * EVERY FILE HERE IS A CUT-OUT ON TRANSPARENT PNG, trimmed to the object and
 * re-centred on one square canvas at a fixed margin. Both halves of that matter
 * and both are easy to get wrong:
 *
 *   transparent   the cards carry no tone block any more (see margiela.css).
 *                 An image with its own background paints a rectangle onto the
 *                 page, which is what the shelf looked like before.
 *   same margin   --object-pad frames every card identically, so a product
 *                 padded tighter in its own file simply reads larger on the
 *                 shelf. The object spans ~86% of its canvas in all of these.
 *
 * A replacement has to meet both, or it will stand out from the rest.
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
    images: [retailLighterImage, retailLighterCheckImage],
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
    image: retailToteImage,
    images: [retailToteImage, retailToteHeartImage],
    tone: "bag",
  },
];

export function formatBhd(value: number): string {
  return `BD ${value.toFixed(3)}`;
}
