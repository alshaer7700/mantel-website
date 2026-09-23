import retailCandleSticksImage from "@/imports/retail-candle-sticks.webp";
import retailToteImage from "@/imports/retail-tote.webp";
import retailToteHeartImage from "@/imports/retail-tote-heart.webp";
import retailLighterImage from "@/imports/retail-lighter.webp";
import retailLighterCheckImage from "@/imports/retail-lighter-check.webp";
import retailCandleImage from "@/imports/retail-candle.webp";
import retailCandleTinMacroImage from "@/imports/retail-candle-tin-macro.webp";
import retailMatchSticksWallImage from "@/imports/retail-match-sticks-wall.webp";
import retailMatchSticksOpenAImage from "@/imports/retail-match-sticks-open-a.webp";

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
  /*
   * The product page's own accordion (ProductDetail.tsx). Static editorial
   * copy, the same pattern as ritual.ts — not a Supabase column, because
   * `objects` carries no field for it and adding one is a migration this
   * change does not need to make. Placeholder wording: check it against the
   * real care instructions before this page goes live.
   */
  /** The longer sensory line under "The Object" — `description` stays the
      short one the shelf card and cart use. */
  story: string;
  care: string;
  collection: string;
};

export type CartLine = {
  product: CartProduct;
  quantity: number;
};

/*
 * ── THE PRODUCT PHOTOGRAPHS ─────────────────────────────────────────────────
 *
 * All five are the real objects, shot 2026-09-15 and in the tree since
 * 2026-09-16:
 *
 *   candles        the four stacked MANTEL tins
 *   lighters       both colourways, leopard then checkerboard — one card,
 *                  stepped through by ObjectSlides
 *   candle-sticks  the pair of cream tapers in the corrugated heart band
 *   match-sticks   the MANTEL safety-matches label
 *   custom-bags    the "Mantel." tote and its red-heart face, also two
 *
 * matcha-powder used to be a sixth, and was the only one still on a pre-launch
 * mockup. It is gone rather than waiting for a photograph: a shelf of five real
 * objects reads better than six with one drawing.
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
    id: "candles",
    name: "Candles",
    description: "A soft light for the end of the day.",
    price: 7,
    image: retailCandleImage,
    images: [retailCandleImage, retailCandleTinMacroImage],
    tone: "candle",
    story: "Soy wax in a stamped tin, poured in small batches. Warm wood and dry smoke — the room after the counter closes.",
    care:
      "Trim the wick to 5mm before each light. Burn for no more than four hours at a time, and keep it away from draughts so the wax burns evenly to the edge of the tin.",
    collection:
      "Soy wax, poured in small batches and finished in the same stamped tin as the rest of the counter shelf.",
  },
  {
    id: "candle-sticks",
    name: "Candle Sticks",
    description: "For the shelf, the table, and the in-between.",
    price: 5.5,
    image: retailCandleSticksImage,
    tone: "sticks",
    story: "A pair of cream tapers, cut long enough to burn through an evening at the table.",
    care: "Wipe with a dry cloth. Keep upright, and away from direct heat.",
    collection: "Sits alongside the candles — the pair the shelf was built around.",
  },
  {
    id: "lighters",
    name: "Lighters",
    description: "A small object with a little ceremony.",
    price: 3,
    image: retailLighterImage,
    images: [retailLighterImage, retailLighterCheckImage],
    tone: "lighter",
    story: "A refillable flame in a pocket-sized case, printed leopard on one side and checkerboard on the other.",
    care: "Refillable. Keep it out of reach of children and away from heat.",
    collection: "Two colourways, leopard and checkerboard — the small object with a little ceremony.",
  },
  {
    id: "match-sticks",
    name: "Match Sticks",
    description: "A little fire for the everyday ritual.",
    price: 2.5,
    image: retailMatchSticksWallImage,
    images: [retailMatchSticksWallImage, retailMatchSticksOpenAImage],
    tone: "matches",
    story: "A box of safety matches under the Mantel label, for the candles and everything else that needs a light.",
    care: "Store somewhere dry, away from the stove.",
    collection: "The everyday companion to the candles on the shelf.",
  },
  {
    id: "custom-bags",
    name: "Custom Bags",
    description: "Made for the things you take with you.",
    price: 6.5,
    image: retailToteImage,
    images: [retailToteImage, retailToteHeartImage],
    tone: "bag",
    story: "Heavy canvas, built for the walk home — the wordmark on one face, a red heart stitched on the other.",
    care: "Machine wash cold, and hang to dry.",
    collection: "Printed both sides — Mantel on one face, a red heart on the other.",
  },
];

export function formatBhd(value: number): string {
  return `BD ${value.toFixed(3)}`;
}
