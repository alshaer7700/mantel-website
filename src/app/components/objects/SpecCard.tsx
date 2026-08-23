import type { ShopObject } from "@/lib/api/objects";
import { ObjectArt } from "@/app/components/objects/ObjectArt";
import { formatPrice } from "@/lib/format";
import { LABEL } from "@/app/components/type";
import { ORDERING_OPEN } from "@/lib/constants";

/*
 * An object as a specimen card: the drawing, the name, a line in the maker's
 * voice, and a spec table.
 *
 * The reference for this is Le Labo, and its own note calls it "the closest to
 * being someone else's idea". For Mantel it isn't borrowed — it is what the
 * packaging already does. The candle tin's label is a spec table with the rows
 * "compounded in / For / Fresh until"; the cold brew states its volume and
 * three words; the matchbox carries the manifesto. This card is that label,
 * rendered.
 *
 * WHAT IT REFUSES TO INVENT. The reference card lists wax, weight, burn time,
 * an edition number ("60 of 120") and a hand-signed date. Exactly one of those
 * is in the database — `spec` — and the rest were placeholder text in a mock.
 * Printing "60 of 120" under a real product is a claim about a physical good,
 * so this renders the rows that exist and nothing else: an object with a bare
 * name gets a bare card rather than five invented fields.
 */

export function SpecCard({
  object,
  onAdd,
}: {
  object: ShopObject;
  onAdd: (o: ShopObject) => void;
}) {
  /* `spec` is one printed line — "Scented candle · 165g / 5.8oz". Split on the
     separator the packaging uses so it can be set as rows, and fall back to a
     single row when there is nothing to split. */
  const rows = object.spec
    .split("·")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <article className="border border-[color:var(--line)] bg-[color:var(--card-surface)] flex flex-col">
      {/* Fixed height, not padding. The four drawings have different intrinsic
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
        <h3 className="font-serif font-normal text-[clamp(1.4rem,4vw,2rem)] leading-[1.05] m-0 mb-[2px] text-[color:var(--ink)]">
          {object.name}
        </h3>

        {/* The italic ember line. The reference hand-writes "poured by hand";
            this uses the sentence the owner actually wrote for the product,
            and shows nothing when there isn't one. */}
        {object.description && (
          <p className="font-serif italic text-[0.95rem] leading-[1.4] text-[color:var(--brand)] m-0 mb-[var(--s-3)] max-w-[34ch]">
            {object.description}
          </p>
        )}

        {/*
          The spec, printed as it is written, with a price row under it.

          An earlier version split the line on its separator and labelled the
          fragments "Item", "Spec 1", "Spec 2". That invented a vocabulary the
          data does not have — "Spec 1" tells a customer nothing, and this card
          exists precisely to avoid inventing fields. The packaging does carry
          real labelled rows ("compounded in / Bahrain", "Fresh until /
          15.8.2027"); when those become columns rather than one free-text
          line, this becomes a proper table. Until then it prints the truth.
        */}
        <dl className="m-0 mt-auto border-t border-[color:var(--line-soft)]">
          {rows.length > 0 && (
            <div className="py-[0.5rem] border-b border-[color:var(--line-soft)]">
              {rows.map((row) => (
                <span
                  key={row}
                  className="block font-mono text-[11px] leading-[1.6] text-[color:var(--ink)]"
                >
                  {row}
                </span>
              ))}
            </div>
          )}
          <div className="flex justify-between gap-[var(--s-2)] py-[0.5rem] border-b border-[color:var(--line-soft)] font-mono text-[11px]">
            <dt className="text-[color:var(--ink-muted)]">Price</dt>
            <dd className="m-0 text-[color:var(--ink)] tabular-nums">
              {/* Seeded at 0 until priced — a dash, never "0.000". */}
              {object.price > 0 ? `${formatPrice(object.price)} BD` : "—"}
            </dd>
          </div>
        </dl>

        {/* No mt-auto here: the <dl> above already claims the slack, and two
            auto margins in one flex column leaves this pinned to the table
            instead of the foot of the card. */}
        <div className="pt-[var(--s-3)]">
          {ORDERING_OPEN && object.price > 0 ? (
            <button
              type="button"
              onClick={() => onAdd(object)}
              className="font-mono text-[11px] tracking-[0.2em] uppercase text-[color:var(--ink)] border border-[color:var(--ink)] px-[var(--s-2)] py-[8px] hover:bg-[color:var(--ink)] hover:text-[color:var(--bg)] transition-colors"
            >
              Add to bag +
            </button>
          ) : (
            <span className={LABEL}>In store</span>
          )}
        </div>
      </div>
    </article>
  );
}
