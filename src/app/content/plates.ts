/*
 * Every photograph the site has a place for, and the brief for shooting it.
 *
 * A plate is a declared slot. Filling one is a single edit here — drop the
 * file in src/assets/ or public/, set `src`, and the plate stops being a
 * placeholder. No component changes, no layout changes, nothing else.
 *
 * `brief` is a production note, never customer copy. See components/Plate.tsx.
 *
 * ── THE RULES, REWRITTEN AGAINST THE REFERENCE SET ────────────────────────
 *
 * These briefs used to encode: no faces, one subject per frame, flat or
 * single-source light, far more empty space than feels comfortable. The
 * reference photographs contradict three of those four, so they are gone.
 *
 *   PEOPLE ARE IN FRAME. Hands especially — holding a cup over a pair of worn
 *   slip-ons, steadying a pitcher, gripping a kettle. One reference is a man's
 *   face in profile over a Chemex. The old "no faces" rule would have thrown
 *   out most of the set, and it was making the shop look unstaffed.
 *
 *   THE FRAME IS FULL, NOT EMPTY. Every reference is a tight crop that fills
 *   its edges. The old rule asked the photograph to carry the whitespace, but
 *   the page already carries an enormous amount of it — that is the whole
 *   layout. A photograph that is also mostly empty adds nothing and reads as a
 *   mistake. The pictures should be dense so the page around them is not.
 *
 *   PHOTOGRAPH THINGS WHERE THEY ARE USED. Never on seamless. A cup in a jean
 *   pocket, cups drying upside down on the group head, a Chemex on a kitchen
 *   island in the afternoon. The working surface is the set.
 *
 *   SHOT ON FILM, OR GRADED LIKE IT. Grain, warm halation around highlights,
 *   focus that is sometimes just off. "Slightly imperfect" is in the brief and
 *   it is the single most consistent quality of the reference set — a clean
 *   digital frame will look wrong beside them no matter what is in it.
 *
 *   ONE LIGHT, DIRECTIONAL. Warm window light indoors, or the machine's own
 *   pool of light in a dark bar. Not a lit set, not a fill.
 *
 *   CONSISTENT. Same camera, same stock, same hands, ideally the same day.
 *   Six photographs that match matter more than six good ones that do not.
 *
 * ── WHAT CANNOT BE USED ───────────────────────────────────────────────────
 *
 * The reference images themselves. They carry other roasters' marks — a
 * Cronotrop cup, a Buthtub poster, a Cot Sth Coffee address block — and this
 * is a real shop's site, not a mood board. They are the brief, not the assets.
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
      "The pour, from the side, at the counter. Both hands in — kettle in one, " +
      "the neck of the brewer in the other. Steam catching the window light. " +
      "Crop at the shoulders; the face can be in it, in profile, out of focus.",
  },
  counter: {
    src: "",
    ref: "PL-02",
    cap: "Portafilter, close",
    brief:
      "Hands and machine, nothing else. Grounds on the steel, the light coming " +
      "off the group head. Shot into the dark so the metal is the brightest " +
      "thing in frame. Tight enough that the edges are all machine.",
  },
  pour: {
    src: "",
    ref: "PL-03",
    cap: "Milk, 62°C",
    brief:
      "The pitcher tipping into the cup, mid-pour, held in the other hand. " +
      "Dark bar behind, one light source. The stream is the subject — freeze " +
      "it, but let the background go soft.",
  },
  room: {
    src: "",
    ref: "PL-04",
    cap: "Room, afternoon",
    brief:
      "The full-bleed frame. Someone at a table with a cup, seen from across " +
      "the room, late light through the window. Not a portrait and not an " +
      "empty interior — the room with a person in it, at rest.",
  },
  hands: {
    src: "",
    ref: "PL-05",
    cap: "Held, close",
    brief:
      "The retail shot: a candle, a matchbox or a bottle held in two hands, " +
      "or set down where it is actually used. Overhead is good — hands, the " +
      "object, the floor or the table, and the person's shoes in the corner.",
  },
  facade: {
    src: "",
    ref: "PL-06",
    cap: "Al Hidd",
    brief:
      "The shopfront, from across the street, early. Someone walking out with " +
      "a cup if the timing allows. Overcast or first light; the sign legible " +
      "but not centred.",
  },
} as const satisfies Record<string, PlateSpec>;

export type PlateName = keyof typeof PLATES;
