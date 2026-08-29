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
 *   development  unfilled plate renders its ref, and nothing else
 *   production   unfilled plate renders NOTHING
 *
 * A section without its photograph still reads as a finished section — the
 * shelf rule, the heading and the type carry it. A section with a grey box
 * reading "shot at f/2.8" does not. Fill `src` in content/plates.ts and the
 * photograph appears in both.
 */

type Props = {
  spec: PlateSpec;
  /** Aspect ratio, CSS form. Defaults to the portrait plate token. */
  ratio?: string;
  /** Overrides the caption as the alt text when the plate is decorative. */
  alt?: string;
  className?: string;
};

/*
 * WHERE THE CAPTION SITS. Declared on the plate, in content/plates.ts, not
 * passed at the call site — where it goes and how it reads are both facts
 * about the photograph, and the layout has no way to know either.
 *
 * The reference set puts type inside the picture — a street number across the
 * cup being pulled, a hiring notice over a flash-lit table. The type is part
 * of the image, not a line underneath it.
 *
 * IT NEEDS A TONE, AND ONE TONE IS NOT ENOUGH. This first shipped as a single
 * placement with paper-white type and no scrim, on the argument that the shot
 * brief reserves a dark corner. That holds for the room photographs and fails
 * completely on the product ones: over a high-key studio frame, white type is
 * invisible. The references do the obvious thing — white on the dark ones,
 * dark on the light one — so this does too.
 *
 * No scrim either way. The references never use one, and a gradient under a
 * caption is an admission that the photograph was not composed for it.
 *
 * Nothing new is written for it. It is the same ref and caption the
 * figcaption would have printed, moved.
 */

export function Plate({ spec, ratio = "var(--ratio-plate)", alt, className = "" }: Props) {
  const caption = spec.caption ?? "under";
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
          <PlaceholderRef spec={spec} />
        )}

        {caption !== "under" && (
          <figcaption
            className={`${CAPTION} absolute left-[var(--s-3)] bottom-[var(--s-3)] ${
              caption === "paper" ? "text-[color:var(--bg)]" : "text-[color:var(--ink)]"
            }`}
          >
            {spec.ref} · {spec.cap}
          </figcaption>
        )}
      </div>

      {caption === "under" && (
        /* One line, not a ref pushed left and a caption pushed right. Split
           across the plate's full width the two halves read as two unrelated
           labels; joined, they read as one catalogue entry. */
        <figcaption className={`${CAPTION} pt-[var(--s-1)]`}>
          {spec.ref} · {spec.cap}
        </figcaption>
      )}
    </figure>
  );
}

const CAPTION =
  "font-mono text-[11px] tracking-[0.2em] uppercase text-[color:var(--ink-muted)] leading-[1.4]";

/*
 * Development only — see the note at the top of this file.
 *
 * The placeholder stands in for the photograph the brief describes, so it
 * takes that photograph's tone: a plate whose caption is set to "paper" has
 * declared its frame is dark, and a pale placeholder under white type would
 * show nothing.
 */
function PlaceholderRef({ spec }: { spec: PlateSpec }) {
  const dark = spec.caption === "paper";

  return (
    <div
      className="absolute inset-0 grid place-items-center text-center p-[var(--s-3)]"
      style={{
        background: dark
          ? "radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,.10), transparent 60%)," +
            "linear-gradient(158deg,#4A443C 0%,#332F29 52%,#413B34 100%)"
          : "radial-gradient(120% 90% at 30% 20%, rgba(255,255,255,.65), transparent 60%)," +
            "linear-gradient(158deg,#EFECE6 0%,#E3DFD7 52%,#EBE7E0 100%)",
      }}
    >
      <div
        className="absolute inset-[12px] border"
        style={{ borderColor: dark ? "rgba(255,255,255,.12)" : "rgba(23,19,16,.09)" }}
      />
      <span
        className={`relative ${CAPTION}`}
        style={dark ? { color: "rgba(255,255,255,.45)" } : undefined}
      >
        {spec.ref}
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
  ratio = "var(--ratio-bleed)",
  className = "",
}: {
  spec: PlateSpec;
  ratio?: string;
  className?: string;
}) {
  if (spec.src === "" && !import.meta.env.DEV) return null;

  return (
    <div className={`-mx-[var(--pad)] ${className}`}>
      {/* The gutter is only put back on a caption that sits under the plate.
          One inside the frame is already positioned against the image. */}
      <Plate
        spec={spec}
        ratio={ratio}
        className={(spec.caption ?? "under") === "under" ? "[&>figcaption]:px-[var(--pad)]" : ""}
      />
    </div>
  );
}
