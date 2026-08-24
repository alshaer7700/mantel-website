/*
 * Drawn figures, laid over a photograph.
 *
 * The reference is a photograph of an empty café table — two real cups, two
 * real chairs — with a man and a woman drawn onto it in one continuous white
 * stroke. Their hands close around the real cups. Her bag hangs off the real
 * chair back. Nobody was photographed; the room was, and the people were put
 * in afterwards.
 *
 * WHY IT SUITS MANTEL, rather than being a borrowed trick. The site already
 * has a drawn vocabulary that says something — ObjectArt, where the products
 * are line drawings and the only colour is the flame. This is the same hand
 * applied to people. It also solves a real problem the photography brief has:
 * "no faces" was cut because it made the shop look unstaffed, but a small
 * café cannot always get releases, good light and the right people at 07:40.
 * A drawn figure is a person in the room with none of that.
 *
 * ── THE HONEST LIMIT, WHICH IS THE WHOLE POINT ────────────────────────────
 *
 * These are not really reusable art. A figure works because it is drawn TO
 * one photograph — the hand lands on that cup, at that angle, at that size.
 * Shipping a generic seated figure and dropping it on any frame produces a
 * drawing floating near a table, which is the failure mode, not the effect.
 *
 * So what lives here is a vocabulary and a starting point. The path data is
 * meant to be adjusted against the real photograph once it exists, and the
 * shot briefs for the plates that carry a figure now say what to leave room
 * for. Treat these as a first pass, not as finished artwork.
 *
 * ── THE VOCABULARY ────────────────────────────────────────────────────────
 *
 * One stroke weight, round caps and joins, no fill. No facial features — the
 * reference draws a head, a cap, a ponytail, and stops. No shading, no
 * hatching, no second weight for emphasis. The line is even everywhere, which
 * is what makes it read as one gesture rather than an illustration.
 *
 * Stroke scales with the frame rather than sitting at a fixed pixel width:
 * vector-effect is deliberately NOT used, so a figure drawn at 400 units wide
 * and displayed at 1200px gets a line three times as thick, which is what
 * keeps it looking hand-drawn at every size instead of turning into wire.
 */

export type FigureKey = "pair" | "walking";

const FIGURES: Record<FigureKey, { viewBox: string; paths: string[] }> = {
  /*
   * Two people at a table, facing each other, with the middle left clear for
   * whatever is really on it.
   *
   * A seated figure in profile is three angles and nothing else: the torso
   * near-vertical, the thigh near-horizontal, the shin dropping back to the
   * floor. Get those and the pose reads; miss the knee and you get a person
   * standing behind a table, which is what the first attempt at this drew.
   *
   * Table height is y≈150, seat y≈200, floor y≈272. The hands come up to the
   * table, so a photograph carrying this figure needs its real cups at about
   * two fifths of the frame height.
   */
  pair: {
    viewBox: "0 0 400 300",
    paths: [
      // ── left figure, facing right ──
      "M95 30a22 22 0 1 1 0 44 22 22 0 0 1 0-44",
      "M73 48a22 22 0 0 1 44-4l16 6",
      // torso as two open lines that stop above the hip — they must not meet
      // the thigh, or the silhouette closes and the figure reads as standing
      "M88 78c-4 34-6 68-4 100",
      "M110 80c-2 32-4 64-4 96",
      // thigh, shin, foot as separate strokes so the knee and ankle show
      "M90 180c22 3 43 5 63 6",
      "M153 186c-2 24-4 48-5 72",
      "M148 258c9 3 18 4 27 4",
      // Upper arm hangs, forearm goes forward to the table. It starts at the
      // FRONT shoulder — anchored at the centre of the chest it overlapped
      // both torso lines and read as a broken diagonal across the body.
      "M112 86c4 16 6 32 6 46 18 3 36 4 54 4",

      // ── right figure, facing left ──
      "M305 30a22 22 0 1 0 0 44 22 22 0 0 0 0-44",
      "M327 44c12 4 20 14 22 26-2 12-10 20-22 24",
      "M312 78c4 34 6 68 4 100",
      "M290 80c2 32 4 64 4 96",
      "M310 180c-22 3-43 5-63 6",
      "M247 186c2 24 4 48 5 72",
      "M252 258c-9 3-18 4-27 4",
      "M288 86c-4 16-6 32-6 46-18 3-36 4-54 4",

      // her bag, hung off the real chair back
      "M348 150h42l6 48h-54z",
      "M357 150a12 12 0 0 1 24 0",
    ],
  },

  /*
   * One person walking out with a cup, for a shopfront frame. Mid-stride: the
   * legs have to open into a clear triangle or it reads as standing.
   */
  walking: {
    viewBox: "0 0 200 300",
    paths: [
      "M100 30a20 20 0 1 1 0 40 20 20 0 0 1 0-40",
      "M80 48a20 20 0 0 1 40-4l14 5",
      // torso, back and front
      "M94 70c-4 30-6 60-4 88",
      "M112 72c4 28 6 56 4 86",
      // forward leg
      "M102 158c10 16 20 32 26 48 2 16 3 32 4 48 8 2 16 3 24 2",
      // trailing leg
      "M96 158c-8 18-16 34-20 50-2 14-4 28-8 42-8 0-16-1-24-3",
      // trailing arm
      "M96 80c-10 14-16 28-18 42 2 10 6 18 10 26",
      // leading arm, carrying
      "M112 82c10 12 16 24 16 36-2 10-6 18-10 26",
      // the cup in it
      "M110 142h22l-4 28h-14z",
      "M108 138h26v4h-26z",
    ],
  },
};

/**
 * `tone` is a fact about the photograph underneath, not about the drawing —
 * white over a dark room, ink over a high-key frame. Same reasoning as the
 * caption placement, and it fails the same way if guessed.
 */
export function FigureArt({
  art,
  tone,
  className = "",
}: {
  art: FigureKey;
  tone: "paper" | "ink";
  className?: string;
}) {
  const figure = FIGURES[art];

  return (
    <svg
      viewBox={figure.viewBox}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      fill="none"
      stroke={tone === "paper" ? "var(--bg)" : "var(--ink)"}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {figure.paths.map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}
