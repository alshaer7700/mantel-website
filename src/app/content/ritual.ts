import { TRAY_ART_VIEWBOX } from "@/app/components/ritual/TrayArt";

/*
 * The Friday Espresso page: one image of the tray, annotated.
 *
 * Everything the page draws lives here rather than in the component, because
 * the two things most likely to change are the picture and the words next to
 * it — neither of which should mean touching layout code.
 *
 * ── THE PICTURE ─────────────────────────────────────────────────────────────
 * TRAY_PHOTO is null, so the page renders the line drawing in
 * components/ritual/TrayArt.tsx. That is the intended treatment rather than a
 * gap: the brand direction on file is "drawn, not photographed", which is also
 * why the retail objects are drawings. To put a photograph there instead:
 *
 *   1. drop the file in src/imports/
 *   2. import it here and set TRAY_PHOTO to it
 *   3. set TRAY_ASPECT to the file's width ÷ height, so the reserved space
 *      matches the image and nothing shifts as it loads
 *   4. check each annotation's x / y against the new frame — they are
 *      percentages of the picture, so a different crop needs them nudged
 *
 * Nothing else changes: the dots, the leader lines and the notes all read from
 * this file either way.
 */
export const TRAY_PHOTO: string | null = null;
export const TRAY_PHOTO_ALT =
  "The Friday Espresso tray: an espresso and a glass of sparkling water, served together";
/** Matches the drawing's viewBox while TRAY_PHOTO is null. */
export const TRAY_ASPECT = TRAY_ART_VIEWBOX.width / TRAY_ART_VIEWBOX.height;

export type TrayAnnotation = {
  /** The printed index, shown on the dot and in front of the label. */
  n: string;
  title: string;
  body: string;
  /*
   * Where the dot sits on the picture, as a percentage of its frame: x from
   * the left edge, y from the top. Percentages rather than pixels so a dot
   * stays on the object it points at at every screen size.
   */
  x: number;
  y: number;
  /** Which rail the label hangs on, wide screens only. */
  side: "left" | "right";
  /** How far down that rail the label sits, again as a percentage. */
  labelY: number;
};

/*
 * Two notes, one per rail: the espresso and the water beside it. That is the
 * whole of the ritual, and it is the whole of the annotation.
 *
 * There were four. The other two named the tray itself and a second, still
 * water on the side — neither of which the owner wanted called out, and the
 * still water was never something the counter actually serves. The tray is
 * still described, in SERVICE_SPECS below, where a fact belongs when it is not
 * worth a line drawn across a picture.
 *
 * WHY THE LABELS SIT WHERE THEY DO. labelY is the note's vertical centre, and
 * the leader runs out of the note at that height, turns beside the picture and
 * comes back in at the dot's height. With one note per rail there is no
 * crowding to design around, so each label sits within a couple of percent of
 * its own dot: the leader reads as a short, level pointer rather than a line
 * hunting across the page for something to attach to.
 */
export const TRAY_ANNOTATIONS: readonly TrayAnnotation[] = [
  {
    n: "01",
    title: "The espresso",
    body:
      "A double, pulled to order and served in a warmed cup. It is meant to be drunk at the counter, in the four or five minutes before it flattens out.",
    /* On the crema, just under the rim — not mid-cup, where it would cover the
       heart, which is the one piece of colour on the page. */
    x: 34,
    y: 31,
    side: "left",
    labelY: 30,
  },
  {
    n: "02",
    title: "Sparkling water",
    body:
      "Poured cold and served alongside, never after. A mouthful before the first sip clears the palate; a mouthful after it carries the finish a little longer.",
    x: 65,
    y: 32.5,
    side: "right",
    labelY: 33,
  },
];

export type CoffeeSpec = { label: string; value: string | null };

/*
 * How the tray is served. Every line here is something the site or the menu
 * already says — the drinks are menu_items rows, cash-at-the-counter is
 * lib/constants' ORDERING_OPEN note — so none of it can drift away from what
 * happens at the counter.
 */
export const SERVICE_SPECS: readonly CoffeeSpec[] = [
  { label: "The coffee", value: "Double espresso" },
  { label: "Alongside", value: "Sparkling water, chilled" },
  { label: "Service", value: "On the tray, at the counter" },
  { label: "Payment", value: "Cash, at the counter" },
  { label: "When", value: "Fridays" },
];

/*
 * The extraction recipe.
 *
 * Every value is null, and the page renders this block ONLY once at least one
 * of them is filled in — so the section does not exist yet rather than
 * existing as a column of em dashes. That is the deliberate half of this: the
 * beans and the recipe are the counter's to state, and a plausible-looking
 * dose that nobody weighed is worse than no dose at all. It is the same rule
 * the menu's nutrition columns follow, where null means "no figure published"
 * and is never rendered as zero.
 *
 * Fill any of these in and the block appears, correctly laid out, with no
 * other change.
 */
export const EXTRACTION_SPECS: readonly CoffeeSpec[] = [
  { label: "Origin", value: null },
  { label: "Process", value: null },
  { label: "Roast", value: null },
  { label: "Dose", value: null },
  { label: "Yield", value: null },
  { label: "Extraction", value: null },
  { label: "Water", value: null },
];
