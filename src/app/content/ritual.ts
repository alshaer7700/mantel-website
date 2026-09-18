import trayPhoto from "@/imports/ritual-friday-espresso-tray.webp";

/*
 * The Friday Espresso page: one image of the tray, annotated.
 *
 * Everything the page draws lives here rather than in the component, because
 * the two things most likely to change are the picture and the words next to
 * it — neither of which should mean touching layout code.
 *
 * ── THE PICTURE ─────────────────────────────────────────────────────────────
 * The shop's own photograph of the tray, shot from above: the espresso, the
 * glass of sparkling water, the spoon and the tray they arrive on. It replaced
 * the line drawing in components/ritual/TrayArt.tsx, which is still in the tree
 * and is still what the page renders if TRAY_PHOTO is ever set back to null.
 *
 * To change the picture again: drop the file in src/imports/, import it here,
 * point TRAY_PHOTO at it, set TRAY_ASPECT to its width / height so the reserved
 * space matches and nothing shifts as it loads, and re-check each annotation's
 * x / y — they are percentages of the picture, so a different crop needs them
 * moved. Nothing else changes: the dots, the leader lines and the notes all
 * read from this file either way.
 */
export const TRAY_PHOTO: string | null = trayPhoto;
export const TRAY_PHOTO_ALT =
  "The Friday Espresso tray: an espresso and a glass of sparkling water, served together";
/** The cropped photograph is 1476 x 1037. */
export const TRAY_ASPECT = 1476 / 1037;

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
 * WHERE THE DOTS ARE. Measured off the photograph rather than guessed, then
 * re-measured when it was cropped. In the original 2000 x 1831 frame the crema
 * — the only strongly orange region, so it isolates as one connected blob —
 * spanned x 50.4–62.2%, y 43.1–55.8%; the glass, the bright blob inside the
 * dark tray, x 28.0–34.8%, y 41.8–52.1%. The file shipped here is cropped to
 * (218, 394)–(1694, 1431) of that original, an equal 210px of breathing space
 * on all four sides of the tray, which puts the tray at x 14.2–85.8%,
 * y 20.3–79.8% instead of the 21–74 / 33–67 it filled before. The percentages
 * below are in the cropped frame. The espresso's dot sits on the crema itself
 * rather than above it — a white numeral needs the dark coffee behind it to
 * read — and the water's sits on the glass rim, where there is nothing to
 * obscure.
 *
 * WHICH RAIL EACH NOTE HANGS ON is forced by the photograph, not chosen. The
 * cup is on the right of the frame and the glass on the left; a leader runs
 * from its rail, round the picture and straight in to its dot, so putting the
 * espresso on the left rail would drag its line across the whole picture and
 * over the water glass on the way. Hence espresso right, water left.
 *
 * THE NUMBERS THEN READ TOP TO BOTTOM instead of left to right, which is why
 * the labels are staggered — 01 high on the right rail, 02 low on the left —
 * rather than sitting level with each other as they did over the drawing. Level
 * labels with the sides swapped would have printed 02 before 01 to anyone
 * reading across, which looks like a mistake rather than a choice.
 *
 * labelY is a percentage of the STAGE's height, and the stage is only as tall
 * as the picture — so cropping the photograph from 1.09 to 1.42 shortened it by
 * a quarter and pushed the two labels toward each other. 30/64 cleared by a
 * hair at the old proportion and collided at the new one; 20/78 restores the
 * gap. Change the crop again and this pair has to be re-checked, not carried
 * over.
 */
export const TRAY_ANNOTATIONS: readonly TrayAnnotation[] = [
  {
    n: "01",
    title: "The espresso",
    body:
      "A double, pulled to order and served in a warmed cup. It is meant to be drunk at the counter, in the four or five minutes before it flattens out.",
    x: 61.5,
    y: 48.5,
    side: "right",
    labelY: 20,
  },
  {
    n: "02",
    title: "Sparkling water",
    body:
      "Poured cold and served alongside, never after. A mouthful before the first sip clears the palate; a mouthful after it carries the finish a little longer.",
    x: 27.6,
    y: 44.5,
    side: "left",
    labelY: 78,
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
