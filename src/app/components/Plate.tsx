import type { PlateSpec } from "@/app/content/plates";

/*
 * A photo slot.
 *
 * ONE DELIBERATE DEPARTURE FROM THE PROTOTYPE, and it is worth reading before
 * "fixing" it.
 *
 * In the prototype an unfilled plate renders a labelled grey frame printing
 * its shot brief — "Wide. The counter empty before opening, one cup set down."
 * That is exactly right for a design prototype: it shows the team what is
 * missing and what to go and shoot.
 *
 * It is wrong for bymantel.com. A customer who reads a production note where a
 * photograph should be is looking at a building site, and right now every one
 * of the six plates is empty. So:
 *
 *   development  unfilled plate renders the brief, as the prototype does
 *   production   unfilled plate renders NOTHING
 *
 * A section without its photograph still reads as a finished section — the
 * shelf rule, the heading and the type carry it. A section with a grey box
 * reading "shot at f/2.8" does not. Fill `src` in content/plates.ts and the
 * photograph appears in both.
 */

type Props = {
  spec: PlateSpec;
  /** Aspect ratio, CSS form: "4 / 5", "16 / 9", "1 / 1". */
  ratio?: string;
  /** Overrides the caption as the alt text when the plate is decorative. */
  alt?: string;
  className?: string;
};

export function Plate({ spec, ratio = "4 / 5", alt, className = "" }: Props) {
  const filled = spec.src !== "";

  if (!filled && !import.meta.env.DEV) return null;

  return (
    <figure className={`m-0 ${className}`}>
      <div
        className="relative overflow-hidden bg-[#EDEAE4]"
        style={{ aspectRatio: ratio }}
      >
        {filled ? (
          <img
            src={spec.src}
            alt={alt ?? spec.cap}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <PlaceholderBrief spec={spec} />
        )}
      </div>
      {/* spec.ref (e.g. "PL-03") is the shoot's own reference code — useful
          while briefing a photographer, meaningless to a customer reading the
          page, so only the caption itself is printed here. */}
      <figcaption className="flex justify-end gap-[var(--s-2)] pt-[var(--s-1)]">
        <span className={CAPTION}>{spec.cap}</span>
      </figcaption>
    </figure>
  );
}

const CAPTION =
  "font-mono text-[11px] tracking-[0.2em] uppercase text-[color:var(--ink-muted)] leading-[1.4]";

/** Development only — see the note at the top of this file. */
function PlaceholderBrief({ spec }: { spec: PlateSpec }) {
  return (
    <div
      className="absolute inset-0 grid place-items-center text-center p-[var(--s-3)]"
      style={{
        background:
          "radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,.65), transparent 60%)," +
          "linear-gradient(158deg,#EFECE6 0%,#E3DFD7 52%,#EBE7E0 100%)",
      }}
    >
      <div className="absolute inset-[12px] border border-[rgba(23,19,16,.09)]" />
      <span className={`relative max-w-[26ch] ${CAPTION}`}>
        {spec.ref} — photograph
        <br />
        <br />
        {spec.brief}
      </span>
    </div>
  );
}

/*
 * A plate that runs edge to edge, cancelling the page gutter.
 *
 * It exists because the margins have to disappear WITH the plate. When an
 * unfilled plate renders nothing (see above) but its wrapper keeps a bleed and
 * a bottom margin, the page is left with a tall unexplained void where a
 * photograph would have been — which reads as a broken image, exactly the
 * impression rendering nothing was meant to avoid.
 *
 * Returning null from one component takes the spacing with it.
 */
export function BleedPlate({
  spec,
  ratio = "16 / 9",
  className = "",
}: {
  spec: PlateSpec;
  ratio?: string;
  className?: string;
}) {
  if (spec.src === "" && !import.meta.env.DEV) return null;

  return (
    <div className={`-mx-[var(--pad)] ${className}`}>
      <Plate spec={spec} ratio={ratio} className="[&>figcaption]:px-[var(--pad)]" />
    </div>
  );
}
