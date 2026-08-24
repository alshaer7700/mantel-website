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
 *   CONSISTENT WITHIN A MODE — see below. Same camera, same stock, same
 *   hands, ideally the same day.
 *
 * ── TWO MODES, NOT ONE ────────────────────────────────────────────────────
 *
 * The second reference set splits cleanly in half, and the halves contradict
 * each other. Three are grainy and flash-lit or found-light; two are clean,
 * lit and deliberate — a cup on seamless with one hard shadow, a candle set on
 * a stack of magazines. Treating those as one instruction would average them
 * into something that is neither.
 *
 *   ROOM (PL-01 to PL-04, PL-06). Everything above. Film, grain, found light,
 *   people and hands, tight crops, real working surfaces. This is the café.
 *
 *   PRODUCT (PL-05, and any photograph attached to an object record). Clean,
 *   not grainy. Lit rather than found — one source, one hard shadow. Either
 *   high-key on a plain surface, or the object set down in a real room and
 *   shot straight. The mark on the object is legible, and the red on it is
 *   doing the only colour work in the frame. This is the shelf.
 *
 * The two modes are why `objects.image_url` exists separately from these
 * plates: a candle shot the way the café is shot would look like a mistake,
 * and a barista shot the way the candle is shot would look like an advert.
 *
 * ── TYPE IN THE FRAME ─────────────────────────────────────────────────────
 *
 * Four of the five references set type over the photograph rather than under
 * it. A plate declares that itself, in `caption` below — and declares the tone
 * with it, because white type over the high-key product frame is invisible and
 * the references do the obvious thing about that. PL-01 takes paper on a dark
 * room shot, PL-05 takes ink on a lit one; both briefs reserve the corner.
 *
 * WHAT IS NOT ADOPTED: the heavy grotesque. Three of these references lead
 * with a wide, very bold sans — it is most of why they read the way they do.
 * Mantel has two families and a rule about which does what, and a third face
 * bought to borrow someone else's volume would cost the one thing the type
 * system has, which is that you can tell what a thing is by the face it is
 * set in. Type in the frame here is the site's own mono.
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
  /**
   * Where the ref · caption line sits, and how it reads.
   *   "under"  below the frame, in ink-muted. The default.
   *   "paper"  inside the frame, paper white — for a dark photograph.
   *   "ink"    inside the frame, in ink — for a high-key one.
   * Setting either of the last two is a promise the brief has to keep: the
   * lower left of that frame must be clear, and the right way round.
   */
  caption?: "under" | "paper" | "ink";
};

export const PLATES = {
  hero: {
    src: "",
    ref: "PL-01",
    cap: "Counter, 07:40",
    caption: "paper",
    brief:
      "ROOM. The pour, from the side, at the counter. Both hands in — kettle " +
      "in one, the neck of the brewer in the other. Steam catching the window " +
      "light. Crop at the shoulders; the face can be in it, in profile, out " +
      "of focus. Leave the lower left quiet and dark: the caption sits in the " +
      "frame on this one.",
  },
  counter: {
    src: "",
    ref: "PL-02",
    cap: "Portafilter, close",
    brief:
      "ROOM. Hands and machine, nothing else. Grounds on the steel, the light coming " +
      "off the group head. Shot into the dark so the metal is the brightest " +
      "thing in frame. Tight enough that the edges are all machine.",
  },
  pour: {
    src: "",
    ref: "PL-03",
    cap: "Milk, 62°C",
    brief:
      "ROOM. The pitcher tipping into the cup, mid-pour, held in the other hand. " +
      "Dark bar behind, one light source. The stream is the subject — freeze " +
      "it, but let the background go soft.",
  },
  room: {
    src: "",
    ref: "PL-04",
    cap: "Room, afternoon",
    brief:
      "ROOM. The full-bleed frame. Someone at a table with a cup, seen from across " +
      "the room, late light through the window. Not a portrait and not an " +
      "empty interior — the room with a person in it, at rest.",
  },
  hands: {
    src: "",
    ref: "PL-05",
    cap: "Candle, lit",
    caption: "ink",
    brief:
      "PRODUCT, not ROOM. One object — the candle tin is the strongest — lit " +
      "with a single source so it throws one hard shadow. High-key on a plain " +
      "surface, or set down on something real and shot straight. Clean: no " +
      "grain, no flash. The label legible and square to the camera, the red " +
      "on it the only colour in the frame. Keep the lower left clear; the " +
      "caption sits in the frame on this one.",
  },
  facade: {
    src: "",
    ref: "PL-06",
    cap: "Al Hidd",
    brief:
      "ROOM. The shopfront, from across the street, early. Someone walking out with " +
      "a cup if the timing allows. Overcast or first light; the sign legible " +
      "but not centred.",
  },
} as const satisfies Record<string, PlateSpec>;

export type PlateName = keyof typeof PLATES;
