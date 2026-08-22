/*
 * The line drawings that stand in for the retail objects.
 *
 * From the design direction: "Drawn, not photographed." These are not
 * placeholders waiting for a photo — they are the intended treatment, which is
 * why they carry their own caption on the home page strip. A photograph, when
 * one exists, sits alongside them rather than replacing them.
 *
 * The only colour in any of them is the flame, in ember. That is the accent
 * budget the direction allows: under ~1% of visible surface.
 *
 * `objects.art_key` in the database selects one of these. An unknown key
 * renders nothing rather than throwing, so adding a product before drawing its
 * art degrades to a card with no drawing instead of a blank page.
 */

const STROKE = "stroke-[color:var(--ink)] [stroke-width:1] fill-none [stroke-linecap:round] [stroke-linejoin:round]";
const FLAME = "stroke-[color:var(--brand)] [stroke-width:1] fill-none [stroke-linecap:round] [stroke-linejoin:round]";

export type ArtKey = "candle" | "matches" | "lighter" | "bag";

const ART: Record<ArtKey, React.ReactElement> = {
  candle: (
    <svg width="70" height="120" viewBox="0 0 70 120" aria-hidden="true">
      <path className={FLAME} d="M35 22c0-7-6-9-4-16-7 5-9 10-9 15a13 13 0 0 0 26 0c0-3-1-6-4-9 1 5-3 8-9 10Z" />
      <path className={STROKE} d="M35 44v6" />
      <rect className={STROKE} x="21" y="50" width="28" height="60" rx="1" />
      <path className={STROKE} d="M21 62h28" />
    </svg>
  ),
  matches: (
    <svg width="112" height="86" viewBox="0 0 112 86" aria-hidden="true">
      <rect className={STROKE} x="8" y="30" width="70" height="46" rx="2" />
      <path className={STROKE} d="M8 44h70" />
      <path className={STROKE} d="M86 74 96 22" />
      <circle className={FLAME} cx="97" cy="16" r="6" />
    </svg>
  ),
  lighter: (
    <svg width="60" height="118" viewBox="0 0 60 118" aria-hidden="true">
      <rect className={STROKE} x="14" y="34" width="32" height="72" rx="4" />
      <path className={STROKE} d="M14 50h32" />
      <path className={STROKE} d="M24 34v-8h12v8" />
      <path className={FLAME} d="M30 22c0-6-5-7-3-13-6 4-8 8-8 12a11 11 0 0 0 22 0c0-3-1-5-3-7 0 4-3 6-8 8Z" />
    </svg>
  ),
  bag: (
    <svg width="86" height="110" viewBox="0 0 86 110" aria-hidden="true">
      <path className={STROKE} d="M18 30h50l6 72H12l6-72Z" />
      <path className={STROKE} d="M18 30c4-8 10-12 25-12s21 4 25 12" />
      <path className={STROKE} d="M26 52h34" />
      <path className={STROKE} d="M26 64h22" />
    </svg>
  ),
};

export function ObjectArt({ artKey }: { artKey: string | null }) {
  if (!artKey || !(artKey in ART)) return null;
  return ART[artKey as ArtKey];
}

/** The three drawings the home page strip shows, in order. */
export const STRIP_KEYS: readonly ArtKey[] = ["candle", "matches", "lighter"];
