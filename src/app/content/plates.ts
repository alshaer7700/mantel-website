/*
 * Every photograph the site has a place for, and the brief for shooting it.
 *
 * A plate is a declared slot. Filling one is a single edit here — drop the
 * file in src/assets/ or public/, set `src`, and the plate stops being a
 * placeholder. No component changes, no layout changes, nothing else.
 *
 * `brief` is a production note, never customer copy. See components/Plate.tsx.
 *
 * ── THE RULES, READ OFF THE REFERENCE SET ────────────────────────────────
 *
 * These have been rewritten twice. The first version was invented ("no faces,
 * one subject per frame, far more empty space than feels comfortable"). The
 * second corrected the parts a first batch of references contradicted. This
 * one is read off five photographs that were named the primary reference, and
 * it settles a question the earlier two got wrong in opposite directions.
 *
 *   PEOPLE, BUT NEVER A PORTRAIT. This is the strongest pattern in the set and
 *   it is in all five: a man seen in profile pouring a kettle, hands holding a
 *   cup over a pair of worn slip-ons, hands steadying a pitcher, the back of a
 *   head in a cap, a barista shot from behind at the counter. Not one face is
 *   presented to the camera.
 *
 *   That resolves an argument this file has had with itself. "No faces" was
 *   the first rule and it was cut for making the shop look unstaffed; "people
 *   are in frame, faces welcome" replaced it. Both were wrong. The rule is
 *   that the shop is full of people and none of them is posing — backs,
 *   profiles, hands, the person cropped by the frame edge. It also happens to
 *   be the rule that needs no model release and no one to be photogenic at
 *   07:40.
 *
 *   HANDS ARE THE SUBJECT, NOT A DETAIL. Three of the five are hands first and
 *   everything else second. Hands doing something specific: gripping a kettle
 *   handle, balancing a saucer, tipping a pitcher.
 *
 *   ONE LIGHT, AND IT IS USUALLY LOW. Four of the five are dark. Warm window
 *   light from one side, or the machine's own pool of light in a dim bar. The
 *   set is not bright, airy or evenly lit, and a photograph that is will look
 *   like it came from somewhere else.
 *
 *   PORTRAIT. Four of the five are upright, roughly 4:5. They are phone
 *   photographs of a real place, not widescreen stills.
 *
 *   IMPERFECT ON PURPOSE. Grain, halation around highlights, motion blur on a
 *   moving hand, focus that misses. One reference is blurred across both
 *   hands and is still the best frame in the set.
 *
 *   SHOT WHERE IT HAPPENS. A kitchen island, a concrete floor, the drip tray,
 *   the counter. Never on seamless, never styled.
 *
 * ── TWO MODES ─────────────────────────────────────────────────────────────
 *
 *   ROOM (PL-01 to PL-04, PL-06). Everything above. This is the café, and it
 *   is most of the site.
 *
 *   PRODUCT (PL-05, and any photograph on an object record). The one place
 *   the set allows a lit, deliberate frame: one source, one hard shadow, the
 *   label square to the camera and the red on it the only colour. Even here,
 *   a hand holding the object beats the object alone.
 *
 * The two modes are why `objects.image_url` exists apart from these plates: a
 * candle shot the way the café is shot looks like a mistake, and a barista
 * shot the way the candle is shot looks like an advert.
 *
 * ── FOUR OF THESE ARE REAL NOW ────────────────────────────────────────────
 *
 * PL-01 to PL-04 are Mantel's own photographs, supplied by the owner: the
 * espresso cups under the group head, the iced cup held against pink tile,
 * the sealed bag with the heart on it, and the two chairs. They are cropped
 * to the ratio each slot needs and nothing else was done to them.
 *
 * PL-05 and PL-06 are still open — the lit product shot and the shopfront.
 * They render as nothing in production until they exist.
 *
 * There are no drawn figures over any of these. An earlier pass laid line
 * drawings over the empty slots; the photographs are the owner's and they are
 * what the site shows.
 *
 * ── TYPE IN THE FRAME ─────────────────────────────────────────────────────
 *
 * A plate can carry its caption inside — see `caption` below and the note in
 * components/Plate.tsx. It takes a tone, because white type over the lit
 * product frame is invisible.
 *
 * WHAT IS NOT ADOPTED, and it is a real departure from the references: their
 * heavy grotesque. Two of the five set type in a plain bold sans — one is a
 * garment print, one is an announcement over a photograph. It is worth being
 * exact about how thin that evidence is: of five images, one shows type on a
 * page-like surface, and it is a social post. The set is a photography
 * reference, not a typography one. Mantel has two faces and a rule about
 * which does what, so type in the frame stays the site's own mono. If the
 * grotesque is wanted literally, it is one @font-face and one class.
 *
 * ── WHAT CANNOT BE USED ───────────────────────────────────────────────────
 *
 * The reference images themselves. They carry other roasters' marks — a
 * Cronotrop cup, a Buthtub poster, a Cot Sth Coffee address block — and this
 * is a real shop's site, not a mood board. They are the brief, not the assets.
 */

import plEspresso from "@/assets/photos/pl-01-espresso.jpg";
import plIced from "@/assets/photos/pl-02-iced.jpg";
import plBag from "@/assets/photos/pl-03-bag.jpg";
import plChairs from "@/assets/photos/pl-04-chairs.jpg";

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
    src: plEspresso,
    ref: "PL-01",
    cap: "Espresso, poured",
    caption: "paper",
    brief:
      "SHOT — the owner's photograph of the espresso cups under the group head. Original brief kept for the reshoot: the pour, from the side. Both hands in — kettle in one, the neck " +
      "of the brewer in the other. Steam catching window light from one side. " +
      "In profile, never facing the camera; crop at the shoulders and let the " +
      "face fall out of focus. Leave the lower left quiet and dark: the " +
      "caption sits in the frame on this one.",
  },
  counter: {
    src: plIced,
    ref: "PL-02",
    cap: "Iced, held",
    brief:
      "SHOT — the owner's photograph of the iced cup held against pink tile. Original brief kept for the reshoot: hands and machine, nothing else — the strongest frame in the " +
      "reference set is exactly this. Grounds on the steel, the light coming " +
      "off the group head, shot into the dark so the metal is the brightest " +
      "thing in frame. Tight enough that the edges are all machine. Blur on a " +
      "moving hand is wanted, not a reject.",
  },
  pour: {
    src: plBag,
    ref: "PL-03",
    cap: "Bag, sealed",
    brief:
      "SHOT — the owner's photograph of the sealed bag with the heart. Original brief kept for the reshoot: the pitcher tipping into the cup, mid-pour, the cup held in the " +
      "other hand. Dark bar behind, one light source, sleeve and wrist in " +
      "frame and no more of the person than that. The stream is the subject — " +
      "freeze it and let everything behind go soft.",
  },
  room: {
    src: plChairs,
    ref: "PL-04",
    cap: "Chairs, empty",
    brief:
      "SHOT — the owner's photograph of the two chairs, straight on against a " +
      "plain wall. Cropped to 3:2 and otherwise untouched.",
  },
  hands: {
    src: "",
    ref: "PL-05",
    cap: "Candle, lit",
    caption: "ink",
    brief:
      "PRODUCT, not ROOM. One object — the candle tin is the strongest — lit " +
      "with a single source so it throws one hard shadow, the label square to " +
      "the camera and the red on it the only colour in frame. Clean: no grain, " +
      "no flash. Better still, a hand holding it: the reference set holds " +
      "everything it photographs. Keep the lower left clear; the caption sits " +
      "in the frame on this one.",
  },
  facade: {
    src: "",
    ref: "PL-06",
    cap: "Al Hidd",
    brief:
      "STILL WANTED. The shopfront from across the street, early. Overcast or " +
      "first light; the sign legible but not centred. Someone walking out with " +
      "a cup if the timing allows — seen from behind, as the reference set is.",
  },
} as const satisfies Record<string, PlateSpec>;

export type PlateName = keyof typeof PLATES;
