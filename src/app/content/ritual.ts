import trayPhoto from "@/imports/mood-friday-espresso-table.jpeg";

/*
 * The Friday Espresso page: one photograph of the tray, annotated.
 *
 * Everything the page draws lives here rather than in the component, because
 * the two things most likely to change are the photograph and the words next
 * to it — neither of which should mean touching layout code.
 *
 * ── SWAPPING THE PHOTOGRAPH ─────────────────────────────────────────────────
 * The import above is a placeholder: the sidewalk-table shot already used in
 * the home page's section 01. To ship the real tray photo, drop the file into
 * src/imports/ and change that one import. Then check each annotation's
 * `x` / `y` against the new frame — they are percentages of the *photo*, not
 * of the page, so a tray shot with a different crop will need them nudged.
 * TRAY_ASPECT below is the frame's width ÷ height; set it to the new file's so
 * the reserved space matches the image and nothing shifts as it loads.
 */
export const TRAY_PHOTO = trayPhoto;
export const TRAY_PHOTO_ALT =
  "The Friday Espresso tray: an espresso and a glass of sparkling water, served together";
export const TRAY_ASPECT = 736 / 981;

export type TrayAnnotation = {
  /** The printed index, shown on the dot and in front of the label. */
  n: string;
  title: string;
  body: string;
  /*
   * Where the dot sits on the photograph, as a percentage of its frame:
   * x from the left edge, y from the top. Percentages rather than pixels so a
   * dot stays on the object it points at at every screen size.
   */
  x: number;
  y: number;
  /** Which rail the label hangs on, wide screens only. */
  side: "left" | "right";
  /** How far down that rail the label sits, again as a percentage. */
  labelY: number;
};

/*
 * Ordered as the eye reads the tray, not as the objects sit on it: the cup
 * first, because that is what the page is about.
 */
export const TRAY_ANNOTATIONS: readonly TrayAnnotation[] = [
  {
    n: "01",
    title: "The espresso",
    body:
      "A double, pulled to order and served in a warmed cup. It is meant to be drunk at the counter, in the four or five minutes before it flattens out.",
    x: 46,
    y: 30,
    side: "left",
    labelY: 8,
  },
  {
    n: "02",
    title: "Sparkling water",
    body:
      "Poured cold and served alongside, never after. A mouthful before the first sip clears the palate; a mouthful after it carries the finish a little longer.",
    x: 63,
    y: 44,
    side: "right",
    labelY: 30,
  },
  {
    n: "03",
    title: "The tray",
    body:
      "Everything arrives on one tray so it arrives at once. The arrangement is the point of the ritual: the cup, the glass and the spoon set down together, in the same order every Friday.",
    x: 40,
    y: 63,
    side: "left",
    labelY: 52,
  },
  {
    n: "04",
    title: "Still water, on the side",
    body:
      "A small glass of still water for afterwards. Free, always, and refilled without being asked.",
    x: 68,
    y: 74,
    side: "right",
    labelY: 74,
  },
];

/*
 * The coffee, as figures.
 *
 * `null` is "not published yet" and renders as an em dash — the same rule the
 * menu's nutrition columns follow, and for the same reason: a blank is honest,
 * and a plausible-looking number that nobody at the counter has confirmed is
 * not. Fill these in and the page needs no other change.
 */
export type CoffeeSpec = { label: string; value: string | null };

export const COFFEE_SPECS: readonly CoffeeSpec[] = [
  { label: "Origin", value: null },
  { label: "Process", value: null },
  { label: "Roast", value: null },
  { label: "Dose", value: null },
  { label: "Yield", value: null },
  { label: "Extraction", value: null },
  { label: "Water", value: null },
  { label: "Served", value: "At the counter, on the tray" },
];
