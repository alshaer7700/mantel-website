import retailCandleSticksUnlitImage from "@/imports/retail-candle-sticks-unlit.webp";
import retailCandleSticksLitImage from "@/imports/retail-candle-sticks-lit.webp";
import retailToteImage from "@/imports/retail-tote.webp";
import retailToteHeartImage from "@/imports/retail-tote-heart.webp";
import retailLighterLeopardFrontImage from "@/imports/retail-lighter-leopard-front.webp";
import retailLighterLeopardBackImage from "@/imports/retail-lighter-leopard-back.webp";
import retailLighterCheckerboardFrontImage from "@/imports/retail-lighter-checkerboard-front.webp";
import retailLighterCheckerboardBackImage from "@/imports/retail-lighter-checkerboard-back.webp";
import retailCandleTinMacroImage from "@/imports/retail-candle-tin-macro.webp";
import retailMatchSticksOpenImage from "@/imports/retail-match-sticks-open.webp";
import retailMatchSticksLabelImage from "@/imports/retail-match-sticks-label.webp";

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
 * All six are the real objects, reshot 2026-09-23 (candles, candle-sticks and
 * match-sticks each moved from one face to several, stepped through by
 * ObjectSlides the same way the tote already was):
 *
 *   candles                the stamped tin, macro
 *   lighters-leopard       front then back of the leopard lighter
 *   lighters-checkerboard  front then back of the checkerboard lighter
 *   candle-sticks          the pair of cream tapers, unlit then lit
 *   match-sticks           the printed label face, then the open box
 *   custom-bags            the "Mantel." wordmark tote, then the red-heart tote
 *
 * Lighters used to be one card stepping through both colourways. Split into
 * two products because they are two separate lighters, not two faces of one —
 * each needs its own Supabase objects row to stay purchasable (see 026).
 *
 * The two tote photos are two separate bags too, not two faces of one — the
 * copy used to claim "printed both sides," which was wrong. Left as one
 * product rather than split like lighters, since nobody has asked for that
 * yet; if it comes up, follow the same pattern (026).
 *
 * matcha-powder used to be a sixth, and was the only one still on a pre-launch
 * mockup. It is gone rather than waiting for a photograph: a shelf of real
 * objects reads better than one with a drawing on it.
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
    image: retailCandleTinMacroImage,
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
    image: retailCandleSticksUnlitImage,
    images: [retailCandleSticksUnlitImage, retailCandleSticksLitImage],
    tone: "sticks",
    story: "A pair of cream tapers, cut long enough to burn through an evening at the table.",
    care: "Wipe with a dry cloth. Keep upright, and away from direct heat.",
    collection: "Sits alongside the candles — the pair the shelf was built around.",
  },
  {
    id: "lighters-leopard",
    name: "Lighters - Leopard",
    description: "A small object with a little ceremony.",
    price: 3,
    image: retailLighterLeopardFrontImage,
    images: [retailLighterLeopardFrontImage, retailLighterLeopardBackImage],
    tone: "lighter",
    story: "A refillable flame in a pocket-sized case, printed leopard.",
    care: "Refillable. Keep it out of reach of children and away from heat.",
    collection: "The leopard colourway — the small object with a little ceremony.",
  },
  {
    id: "lighters-checkerboard",
    name: "Lighters - Checkerboard",
    description: "A small object with a little ceremony.",
    price: 3,
    image: retailLighterCheckerboardFrontImage,
    images: [retailLighterCheckerboardFrontImage, retailLighterCheckerboardBackImage],
    tone: "lighter",
    story: "A refillable flame in a pocket-sized case, printed checkerboard.",
    care: "Refillable. Keep it out of reach of children and away from heat.",
    collection: "The checkerboard colourway — the small object with a little ceremony.",
  },
  {
    id: "match-sticks",
    name: "Match Sticks",
    description: "A little fire for the everyday ritual.",
    price: 2.5,
    image: retailMatchSticksLabelImage,
    images: [retailMatchSticksLabelImage, retailMatchSticksOpenImage],
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
    story: "Heavy canvas, built for the walk home — two versions, one printed with the wordmark, one with a red heart.",
    care: "Machine wash cold, and hang to dry.",
    collection: "Two versions — one printed with the Mantel wordmark, one with a red heart.",
  },
];

export function formatBhd(value: number): string {
  return `BD ${value.toFixed(3)}`;
}
