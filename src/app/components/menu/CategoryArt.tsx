import type { CategoryArtKey } from "@/app/content/menuTheme";

/*
 * One line drawing per menu heading, in the same hand as ObjectArt: 1px
 * stroke, round caps, nothing filled. "Drawn, not photographed" applies here
 * for the same reason it applies on the retail shelf — and with more force,
 * since `menu_items.image_url` is null on every row today. A board of empty
 * grey frames would read as a broken page; a board of drawings reads as the
 * menu.
 *
 * ONE DIFFERENCE FROM ObjectArt, and it is the whole reason this is a separate
 * file rather than five more entries there. ObjectArt hard-codes its strokes to
 * --ink, which is correct on paper and invisible on a panel flooded with
 * --cat-coffee-deep. These strokes are currentColor, so a drawing takes the
 * colour of whatever text it sits with: ink on the closed panel, paper on the
 * open one, with no second copy of the artwork.
 *
 * The drawings are sized by their container, not by their own width/height —
 * the board shows one at ~120px and the spread shows the same one at ~340px.
 * viewBox plus a class from the call site does that; a fixed width attribute
 * would not.
 */

const STROKE = "fill-none stroke-current [stroke-width:1] [stroke-linecap:round] [stroke-linejoin:round]";

const ART: Record<CategoryArtKey, React.ReactElement> = {
  /* Cup and saucer, three-quarter on. The handle is a single arc rather than a
     closed loop: at 120px a two-stroke handle fills in and reads as a blob. */
  cup: (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="w-full h-full">
      <path className={STROKE} d="M26 44h58v30a22 22 0 0 1-22 22H48a22 22 0 0 1-22-22V44Z" />
      <path className={STROKE} d="M84 52h8a14 14 0 0 1 0 28h-8" />
      <path className={STROKE} d="M16 100h88" />
      <path className={STROKE} d="M44 30c0-6 6-8 6-14" />
      <path className={STROKE} d="M60 30c0-6 6-8 6-14" />
    </svg>
  ),
  /* Tall glass, iced: the band near the top is the fill line, the two short
     rules below it are the ice. */
  glass: (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="w-full h-full">
      <path className={STROKE} d="M38 18h44l-6 84a6 6 0 0 1-6 6H50a6 6 0 0 1-6-6L38 18Z" />
      <path className={STROKE} d="M39 34h42" />
      <path className={STROKE} d="M45 58h30" />
      <path className={STROKE} d="M47 74h26" />
      <path className={STROKE} d="M66 18V6" />
    </svg>
  ),
  /* The flask from ObjectArt, redrawn to this viewBox. Square shoulders — the
     flat shoulder is what makes it read as theirs rather than as clip art. */
  bottle: (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="w-full h-full">
      <rect className={STROKE} x="52" y="8" width="16" height="12" rx="1" />
      <path className={STROKE} d="M54 20v8c0 2-1 3-3 4-6 3-9 6-9 12v60a6 6 0 0 0 6 6h24a6 6 0 0 0 6-6V44c0-6-3-9-9-12-2-1-3-2-3-4v-8" />
      <path className={STROKE} d="M42 58h36" />
      <path className={STROKE} d="M42 76h36" />
    </svg>
  ),
  /* Half a panini, cut on the diagonal and stood on its crust: the outer
     triangle is the bread, the inner one the filling, and the three short
     strokes are the grill.

     Drawn cut rather than whole on purpose. A whole pressed sandwich in one
     stroke weight is a rounded rectangle — at 120px it reads as a cushion.
     The diagonal cut is the thing that says sandwich. */
  panini: (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="w-full h-full">
      <path className={STROKE} d="M16 94 58 22a3 3 0 0 1 5 0l41 72a3 3 0 0 1-3 4H19a3 3 0 0 1-3-4Z" />
      <path className={STROKE} d="M32 84 60 38l28 46Z" />
      <path className={STROKE} d="m68 50 7 4" />
      <path className={STROKE} d="m76 62 7 4" />
      <path className={STROKE} d="m82 74 7 4" />
    </svg>
  ),
  /* Cinnamon bun, from above: the spiral is one path so the stroke stays
     continuous through the turns. */
  bun: (
    <svg viewBox="0 0 120 120" aria-hidden="true" className="w-full h-full">
      <circle className={STROKE} cx="60" cy="60" r="42" />
      <path className={STROKE} d="M60 88a28 28 0 1 1 28-28 22 22 0 0 1-22 22 16 16 0 0 1-16-16 11 11 0 0 1 11-11" />
      <path className={STROKE} d="M28 34c6 2 10 2 14 0" />
      <path className={STROKE} d="M78 98c6 2 10 2 14 0" />
    </svg>
  ),
};

export function CategoryArt({ artKey }: { artKey: CategoryArtKey }) {
  return ART[artKey];
}
