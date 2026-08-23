import { ObjectArt, STRIP_KEYS } from "@/app/components/objects/ObjectArt";
import { LABEL } from "@/app/components/type";

/*
 * The line-drawing strip: three objects standing on a drawn shelf, captioned
 * "Drawn, not photographed."
 *
 * That caption is the point. These are not stand-ins for photography — the
 * strip is where the design direction states its own rule out loud, which is
 * why it stays even once real product photographs exist.
 *
 * The drawings sit ON the rule, so they are bottom-aligned and the rule is a
 * sibling directly beneath them rather than a border on the row.
 *
 * On phones only the first drawing shows. Three at that width shrinks each to
 * the point where the linework closes up.
 */

const NAMES = ["Candle", "Safety matches", "Brass lighter"];

export function Strip() {
  return (
    <div className="pt-[var(--s-5)]">
      <div className="grid grid-cols-1 sm:grid-cols-3 items-end gap-[var(--s-2)] min-h-[110px]">
        {STRIP_KEYS.map((key, i) => (
          <div
            key={key}
            className={`flex flex-col items-center gap-[0.85rem] ${i > 0 ? "hidden sm:flex" : ""}`}
          >
            <ObjectArt artKey={key} />
            <span className={LABEL}>
              {String(i + 1).padStart(2, "0")} / {NAMES[i]}
            </span>
          </div>
        ))}
      </div>
      <div style={{ height: "var(--shelf)", background: "var(--ink)" }} />
      <div className="flex justify-between gap-[var(--s-2)] pt-[0.6rem]">
        <span className={LABEL}>The shelf</span>
        <span className={LABEL}>Drawn, not photographed</span>
      </div>
    </div>
  );
}
