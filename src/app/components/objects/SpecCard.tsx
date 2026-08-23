import type { ShopObject } from "@/lib/api/objects";
import { ObjectArt } from "@/app/components/objects/ObjectArt";
import { formatPrice } from "@/lib/format";

/*
 * An object, as its label: the drawing, the name, the spec line, the price.
 *
 * WHAT THE CARD DROPPED. It used to carry an italic line in the maker's voice
 * under the name, a spec split into several printed rows, and a footer that
 * said "In store" or offered an Add control. Name, one spec line, price — the
 * card is now the four things the candle tin's own label leads with, and
 * nothing it doesn't.
 *
 * The spec prints as it is written. An earlier version split it on its
 * separator and labelled the fragments "Item", "Spec 1", "Spec 2", inventing a
 * vocabulary the data does not have. The packaging carries real labelled rows
 * ("compounded in / Bahrain", "Fresh until / 15.8.2027"); when those become
 * columns rather than one free-text line, this becomes a proper table.
 *
 * The drawing stays. It is not copy and it is not a placeholder waiting for a
 * photograph — "drawn, not photographed" is the intended treatment.
 */

export function SpecCard({ object }: { object: ShopObject }) {
  return (
    <article className="border border-[color:var(--line)] bg-[color:var(--card-surface)] flex flex-col">
      {/* Fixed height, not padding. The drawings have different intrinsic
          sizes, so padding alone left every card's name on a different line
          and the row read as ragged. */}
      <div
        className="grid place-items-center border-b border-[color:var(--line-soft)] shrink-0"
        style={{ height: "clamp(150px, 22vw, 190px)" }}
      >
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

      <div className="p-[var(--s-3)] flex flex-col flex-1">
        <h3 className="font-serif font-normal text-[clamp(1.4rem,4vw,2rem)] leading-[1.05] m-0 text-[color:var(--ink)]">
          {object.name}
        </h3>

        <dl className="m-0 mt-auto pt-[var(--s-3)] flex justify-between gap-[var(--s-2)] items-baseline font-mono text-[11px] leading-[1.6]">
          <dt className="text-[color:var(--ink-muted)] min-w-0">{object.spec}</dt>
          {/* Seeded at 0 until priced — a dash, never "0.000". */}
          <dd className="m-0 text-[color:var(--ink)] tabular-nums shrink-0">
            {object.price > 0 ? `${formatPrice(object.price)} BD` : "—"}
          </dd>
        </dl>
      </div>
    </article>
  );
}
