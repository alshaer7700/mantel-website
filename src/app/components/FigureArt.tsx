/*
 * Drawn figures — the illustration half of Mantel's identity.
 *
 * ── DRAWN FROM THE REFERENCE, NOT FROM MEMORY ─────────────────────────────
 *
 * The first version of these was drawn blind and it showed. Pulling the
 * reference out of the video at full resolution made four errors obvious, and
 * all four are fixed here:
 *
 *   THE LINE WAS TOO THIN. The reference stroke is roughly 1% of the frame
 *   width — heavy, confident, the width of a marker. Ours was 0.75% and read
 *   as wire.
 *
 *   THE POSE WAS PURE PROFILE. The reference figures are seen from behind and
 *   to the side, which is why they have a wide sweeping shoulder rather than a
 *   flat torso. That sweep is most of what makes them read as people.
 *
 *   THE HANDS AND FEET WERE MISSING. The reference draws fingers curling
 *   around the real cup and a proper shoe with a sole — the two places the
 *   drawing meets the world. Ours stopped at a line end.
 *
 *   THEY WERE MIRRORED. Two identical figures facing each other read as a
 *   diagram. In the reference the man sits square with both feet forward and
 *   the woman has her legs crossed; they are drawn separately.
 *
 * ── THE VOCABULARY ────────────────────────────────────────────────────────
 *
 * One stroke weight, round caps and joins, no fill. No facial features — the
 * reference draws a head, a cap, a ponytail and stops. No shading, no second
 * weight for emphasis.
 *
 * Stroke scales with the frame rather than sitting at a fixed pixel width:
 * vector-effect is deliberately NOT used, so a figure drawn at 400 units and
 * displayed at 1200px gets a line three times as thick. That is what keeps it
 * looking drawn at every size instead of turning into wire.
 *
 * ── THE HONEST LIMIT ──────────────────────────────────────────────────────
 *
 * A figure laid over a photograph works because it is drawn TO that
 * photograph — the hand lands on that cup, at that angle. These are a
 * vocabulary and a starting point, meant to be adjusted against the real
 * frame. Standing on their own, in a section break or the footer, they are
 * finished as they are.
 */

export type FigureKey = "pair" | "walking" | "sitting";

type Figure = { viewBox: string; paths: string[] };

const FIGURES: Record<FigureKey, Figure> = {
  /*
   * Two people at a table, the middle left clear for whatever is really on it.
   *
   * A seated figure is three angles: torso near-vertical, thigh
   * near-horizontal, shin dropping back to the floor. The limbs are separate
   * strokes so the knee and ankle show — drawn as one run, the silhouette
   * closes and you get a person standing behind a table.
   *
   * Table height is y≈150, seat y≈200, floor y≈276. A photograph carrying
   * this figure needs its real cups at about two fifths of the frame height.
   */
  pair: {
    viewBox: "0 0 400 300",
    paths: [
      // ── left figure: cap, sitting square, both feet forward ──
      "M68 62a30 30 0 0 1 60 0",                        // cap dome
      "M68 62c-13 1-22 5-27 12 10 5 21 5 32 1",         // brim, pointing away
      "M70 64c1 19 14 31 28 31s26-12 28-31",            // jaw
      "M84 96c-13 7-23 17-29 30",                       // back of the shoulder
      "M84 96c19 4 35 13 47 27",                        // shoulder sweeping forward
      "M55 128c-5 24-6 48-2 72",                        // back, down to the seat
      "M131 125c14 4 27 9 40 15",                       // upper arm into forearm
      "M171 140c7-4 13-3 16 3-3 6-9 8-16 5",            // fingers curled at the cup
      "M112 132c-3 21-5 42-5 63",                       // front of the torso
      "M53 200c26 6 51 8 76 6",                         // thigh
      "M129 206c-2 20-4 40-7 60",                       // shin
      "M118 266c-5 7-2 13 8 15 12 2 23 0 32-4 1-6-3-10-11-11z", // shoe
      "M119 278c13 4 27 4 39-1",                        // sole

      // ── right figure: ponytail, legs crossed. Drawn, not mirrored ──
      "M272 62a30 30 0 0 1 60 0",
      "M330 52c14 5 22 16 24 30-3 13-12 22-25 26",      // ponytail
      "M274 64c1 19 14 31 28 31s26-12 28-31",
      "M316 96c13 7 23 17 29 30",
      "M316 96c-19 4-35 13-47 27",
      "M345 128c5 24 6 48 2 72",
      "M269 125c-14 4-27 9-40 15",
      "M229 140c-7-4-13-3-16 3 3 6 9 8 16 5",
      "M288 132c3 21 5 42 5 63",
      "M347 200c-24 6-47 9-70 8",                        // upper thigh
      "M277 208c14 9 26 20 36 33",                       // the crossed leg, rising
      "M313 241c-4 14-9 27-15 39",                       // shin of it, dropping
      "M298 280c-8 4-11 9-8 14 8 2 16-2 22-9z",          // pointed shoe
      "M262 210c-3 22-6 44-11 65",                       // the under leg
      "M251 275c-9 6-11 11-6 15 9 1 17-4 22-11z",

      // her bag, hung off the real chair back
      "M352 140h40l6 46h-52z",
      "M361 140a12 12 0 0 1 24 0",
    ],
  },

  /*
   * One person walking out with a cup. Mid-stride: the legs have to open into
   * a clear triangle or it reads as standing.
   */
  walking: {
    viewBox: "0 0 200 300",
    paths: [
      "M74 52a28 28 0 0 1 56 0",
      "M74 52c-12 1-21 5-26 12 10 5 21 5 31 1",
      "M76 54c1 18 13 30 26 30s25-12 26-30",
      "M90 86c-11 6-19 15-24 26",
      "M90 86c17 4 30 12 39 25",
      "M64 116c-5 22-7 44-5 66",
      "M124 116c4 20 6 40 4 60",
      "M100 178c11 17 21 34 27 51 2 16 3 32 4 48",       // forward leg
      "M92 178c-9 18-17 35-21 51-2 14-4 28-8 42",        // trailing leg
      "M131 277c9 4 12 9 9 15-10 3-20-1-27-8z",          // forward shoe
      "M63 271c-9 5-12 10-8 15 10 2 20-3 26-10z",        // trailing shoe
      "M126 118c9 12 14 24 14 35-2 10-6 18-10 25",       // the carrying arm
      "M126 178c7-5 14-4 17 2-3 7-10 9-17 5",            // fingers on the cup
      "M132 172h24l-4 32h-16z",                          // the cup
      "M130 166h28v6h-28z",                              // its lid
    ],
  },

  /*
   * One person on a chair, side on, cup resting on the knee. For a section
   * break or a footer, where a figure stands alone rather than over a frame.
   */
  sitting: {
    viewBox: "0 0 220 300",
    paths: [
      "M74 58a28 28 0 0 1 56 0",
      "M132 48c13 5 20 15 22 28-3 12-11 20-23 24",
      "M76 60c1 18 13 30 26 30s25-12 26-30",
      "M90 92c-12 6-21 16-26 28",
      "M90 92c18 4 32 12 43 25",
      "M62 122c-5 22-6 45-3 68",
      "M119 120c-3 19-5 38-5 57",
      "M60 190c24 6 47 8 70 6",                          // thigh
      "M130 196c-2 19-4 38-6 57",                         // shin
      "M118 252c-6 7-3 13 7 15 11 2 22 0 30-4 1-6-3-10-10-11z",
      "M119 264c12 4 25 4 36-1",
      "M104 174c8-5 15-4 18 2-3 7-11 9-18 5",             // hand on the knee
      "M112 158h22l-4 22h-14z",                           // the cup on it
      // the chair, drawn rather than photographed
      "M46 128h6v122",
      "M46 190h84",
      "M130 190v60",
    ],
  },
};

/**
 * `tone` is a fact about what sits behind the drawing, not about the drawing —
 * paper over a dark photograph, ink over a pale one or over the page itself.
 *
 * `inline` takes the figure out of the absolute-positioned overlay and lets it
 * sit in the flow, which is how the brief wants illustrations used between
 * sections, in empty states and in the footer.
 */
export function FigureArt({
  art,
  tone,
  inline = false,
  className = "",
}: {
  art: FigureKey;
  tone: "paper" | "ink";
  inline?: boolean;
  className?: string;
}) {
  const figure = FIGURES[art];

  return (
    <svg
      viewBox={figure.viewBox}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      className={`${inline ? "block w-full h-auto" : "absolute inset-0 w-full h-full"} pointer-events-none ${className}`}
      fill="none"
      stroke={tone === "paper" ? "var(--bg)" : "var(--ink)"}
      strokeWidth={4.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {figure.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
