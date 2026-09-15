/*
 * The Friday Espresso tray, drawn.
 *
 * Not a placeholder waiting for a photograph. The brand direction on file is
 * "drawn, not photographed" — the same reason the retail objects are line
 * drawings (components/objects/ObjectArt.tsx) rather than product shots — and
 * this uses that file's exact vocabulary: 1px ink strokes, round caps, no
 * fills, and the brand red spent on one small mark and nothing else. Here that
 * is the heart on the cup, which is the wordmark's own motif.
 *
 * A photograph, when one exists, replaces this without touching the page:
 * set TRAY_PHOTO in content/ritual.ts and FridayEspresso renders the image
 * instead. The annotation coordinates are the only thing that has to follow.
 *
 * THE VIEWBOX IS A CONTRACT. content/ritual.ts positions every dot as a
 * percentage of this 400 × 300 frame, so moving an object here means moving
 * its dot there. The whole drawing is nudged up 22 units so the ink sits
 * centred in the box rather than low in it — leaving the coordinates below as
 * they were drawn, and keeping the arithmetic in one place.
 */

const STROKE =
  "stroke-[color:var(--ink)] [stroke-width:1.1] fill-none [stroke-linecap:round] [stroke-linejoin:round]";
const HEART =
  "stroke-[color:var(--brand)] [stroke-width:1.1] fill-none [stroke-linecap:round] [stroke-linejoin:round]";

export const TRAY_ART_VIEWBOX = { width: 400, height: 300 } as const;

export function TrayArt() {
  return (
    <svg
      className="editorial-ritual-art"
      viewBox={`0 0 ${TRAY_ART_VIEWBOX.width} ${TRAY_ART_VIEWBOX.height}`}
      role="img"
      aria-label="A tray carrying an espresso on its saucer, a tall glass of sparkling water, a smaller glass of still water and a spoon"
    >
      <g transform="translate(0 -22)">
        {/* ── the tray ── */}
        <rect className={STROKE} x="26" y="252" width="352" height="22" rx="3" />
        <path className={STROKE} d="M26 260h352" />
        <path className={STROKE} d="M60 274v8" />
        <path className={STROKE} d="M344 274v8" />

        {/* ── the spoon, laid on the tray ── */}
        <ellipse className={STROKE} cx="48" cy="247" rx="11" ry="5.5" />
        <path className={STROKE} d="M59 247h25" />

        {/* ── the espresso: saucer, cup, handle, crema line ── */}
        <path className={STROKE} d="M72 196h128c-4 11-13 18-23 18H95c-10 0-19-7-23-18Z" />
        <path className={STROKE} d="M96 110h80" />
        <path className={STROKE} d="M96 110c0 46 6 86 16 86" />
        <path className={STROKE} d="M176 110c0 46-6 86-16 86" />
        <path className={STROKE} d="M112 196h48" />
        <path className={STROKE} d="M103 121h66" />
        <path className={STROKE} d="M176 128c24-2 26 38 2 34" />

        {/* The whole accent budget, on the one object the page is named for. */}
        <path
          className={HEART}
          transform="translate(136 158) scale(1.9)"
          d="M0 4.6C-3.6 1.4-5.6-0.6-5.6-2.8A2.8 2.8 0 0 1 0-4.2 2.8 2.8 0 0 1 5.6-2.8C5.6-0.6 3.6 1.4 0 4.6Z"
        />

        {/* ── steam ── */}
        <path className={STROKE} d="M116 92c-6-9 6-14 0-24" />
        <path className={STROKE} d="M146 92c-6-9 6-14 0-24" />

        {/* ── sparkling water: the tall glass, its fill line, its bubbles ── */}
        <path className={STROKE} d="M232 40v202c0 6 5 10 11 10h34c6 0 11-4 11-10V40" />
        <path className={STROKE} d="M232 40h56" />
        <path className={STROKE} d="M233 66h54" />
        <circle className={STROKE} cx="244" cy="92" r="3" />
        <circle className={STROKE} cx="258" cy="112" r="2.2" />
        <circle className={STROKE} cx="274" cy="86" r="2.2" />
        <circle className={STROKE} cx="250" cy="140" r="3" />
        <circle className={STROKE} cx="272" cy="130" r="2.2" />
        <circle className={STROKE} cx="241" cy="168" r="2" />
        <circle className={STROKE} cx="266" cy="182" r="2.6" />
        <circle className={STROKE} cx="280" cy="158" r="2" />

        {/* ── still water: the shorter glass ── */}
        <path className={STROKE} d="M316 126v118c0 5 4 8 9 8h28c5 0 9-3 9-8V126" />
        <path className={STROKE} d="M316 126h46" />
        <path className={STROKE} d="M317 152h44" />
      </g>
    </svg>
  );
}
