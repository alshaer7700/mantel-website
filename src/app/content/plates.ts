/*
 * Every photograph the site has a place for, and the brief for shooting it.
 *
 * This is the prototype's IMAGES object, lifted whole. The arrangement it
 * encodes is the useful part: a plate is a declared slot, and filling one is a
 * single edit here — drop the file in src/assets/ or public/, set `src`, and
 * the plate stops being a placeholder. No component changes, no layout
 * changes, nothing else to remember.
 *
 * `brief` is a production note, not customer copy. See components/Plate.tsx
 * for where it does and does not appear.
 *
 * The photography rules these briefs encode, from the design direction: no
 * faces, one subject per frame, flat or single-source light, far more empty
 * space than feels comfortable, and no stock substitutions.
 */

export type PlateSpec = {
  /** Empty until a real photograph exists. */
  src: string;
  /** Printed under the plate: "PL-01 · Counter, 07:40". */
  ref: string;
  /** The other half of that line. Two words at most — the rule is the point. */
  cap: string;
  /** What to shoot. Never shown to visitors. */
  brief: string;
};

export const PLATES = {
  hero: {
    src: "",
    ref: "PL-01",
    cap: "Counter, 07:40",
    brief:
      "Wide. The counter empty before opening, one cup set down. Flat window light from the left, no people.",
  },
  counter: {
    src: "",
    ref: "PL-02",
    cap: "Portafilter, close",
    brief: "Close. Hands only, no faces. Coffee grounds, brass, matte black. Shot at f/2.8.",
  },
  pour: {
    src: "",
    ref: "PL-03",
    cap: "Milk, 62°C",
    brief: "Close. The pour mid-motion, cup on a plain surface. Nothing else in frame.",
  },
  room: {
    src: "",
    ref: "PL-04",
    cap: "Shelf, afternoon",
    brief:
      "Wide. The retail shelf straight on, symmetrical, objects evenly spaced. Empty wall above.",
  },
  hands: {
    src: "",
    ref: "PL-05",
    cap: "Wick, lit",
    brief: "Close. A match meeting a candle wick. Dark surround, single warm point of light.",
  },
  facade: {
    src: "",
    ref: "PL-06",
    cap: "Al Hidd",
    brief:
      "Wide. The shopfront straight on from across the street. Overcast or early morning, no cars.",
  },
} as const satisfies Record<string, PlateSpec>;

export type PlateName = keyof typeof PLATES;
