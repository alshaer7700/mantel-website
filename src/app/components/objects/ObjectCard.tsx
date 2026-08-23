import type { ShopObject } from "@/lib/api/objects";
import { ObjectArt } from "@/app/components/objects/ObjectArt";
import { formatPrice } from "@/lib/format";

/*
 * One product on the retail shelf.
 *
 * The image slot follows the same rule as the café plates: a photograph if
 * `image_url` is set, otherwise the line drawing — which is the intended
 * treatment here, not a placeholder (see ObjectArt). If neither exists the
 * frame stays empty and quiet rather than announcing itself.
 */

type Props = {
  object: ShopObject;
  onAdd: (o: ShopObject) => void;
  /** False while ordering is still locked — see App's orderingOpen. */
  canAdd: boolean;
};

export function ObjectCard({ object, onAdd, canAdd }: Props) {
  return (
    <article className="flex flex-col gap-[var(--s-2)]">
      <div className="relative overflow-hidden bg-[#EDEAE4] grid place-items-center" style={{ aspectRatio: "1 / 1" }}>
        {object.image_url ? (
          <img
            src={object.image_url}
            alt={object.name}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <ObjectArt artKey={object.art_key} />
        )}
      </div>

      <div className="flex flex-col gap-[6px]">
        <h3 className="font-serif text-[1.3rem] leading-[1.15] text-[color:var(--ink)]">
          {object.name}
        </h3>
        {object.spec && (
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-[color:var(--ink-muted)] leading-[1.4]">
            {object.spec}
          </span>
        )}

        <div className="flex justify-between items-baseline gap-[var(--s-2)] pt-[var(--s-1)] border-t border-[color:var(--line-soft)]">
          <span className="font-mono text-[length:var(--fs-price)] text-[color:var(--ink)]">
            {formatPrice(object.price)}
          </span>
          {canAdd ? (
            <button
              type="button"
              onClick={() => onAdd(object)}
              className="font-mono text-[11px] tracking-[0.2em] uppercase text-[color:var(--ink)] hover:opacity-60 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand)]"
            >
              Add to bag +
            </button>
          ) : (
            /* Not a disabled button: there is nothing to enable yet, and a
               greyed-out control invites clicking. A plain note says the true
               thing instead. */
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-[color:var(--ink-muted)]">
              In store
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
