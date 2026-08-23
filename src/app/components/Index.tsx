import type { MenuItem, MenuCategoryKey, Page, MenuCategory } from "@/app/types";
import type { ShopObject } from "@/lib/api/objects";
import { CATEGORY_LABELS, formatPrice } from "@/lib/format";
import { LABEL } from "@/app/components/type";

/*
 * The index: everything the shop sells, numbered, on one screen.
 *
 * Adapted from the "index" direction, with two deliberate departures.
 *
 * NO THIRD TYPEFACE. The reference sets this in a tight grotesk (Archivo).
 * Mantel has two families and a documented rule about which does what
 * (guidelines/FONTS.md); adding a third to borrow someone else's texture
 * would cost 40-odd KB and the one thing the type system currently has, which
 * is that you can tell what a thing is by the face it is set in. The
 * structure is the borrowed part. The voice stays Fira Mono and EB Garamond.
 *
 * NO INVENTED CONTINUITY. The reference numbers its rows 001–015 straight
 * through, drinks into objects, as if one catalogue. Here the numbering is
 * per section and derived from sort order, so 01 in Coffee is the first
 * coffee — a number that means something on a printed menu, not a position in
 * a list that reshuffles when an item sells out.
 *
 * Why it earns its place: it needs no photography, it puts the whole shop
 * above the fold, and a customer deciding what to have does not scroll.
 */

type Props = {
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
  objects: ShopObject[];
  linkTo: (p: Page, c?: MenuCategory) => {
    href: string;
    onClick: (e: React.MouseEvent) => void;
  };
};

export function Index({ sections, objects, linkTo }: Props) {
  const filled = sections.filter(([, items]) => items.length > 0);
  const total = filled.reduce((n, [, items]) => n + items.length, 0) + objects.length;

  return (
    <div>
      {/* The count is computed, never written down. A hardcoded "16 items"
          goes wrong the first time something sells out. */}
      <div className="flex justify-between items-baseline border-b-2 border-[color:var(--ink)] pb-[0.7rem]">
        <h2 className="font-serif font-normal text-[clamp(1.5rem,5vw,2.6rem)] tracking-[-0.02em] m-0 text-[color:var(--ink)]">
          The index
        </h2>
        <span className={LABEL}>
          {total} {total === 1 ? "line" : "lines"}
        </span>
      </div>

      {filled.map(([key, items]) => (
        <Group key={key} title={CATEGORY_LABELS[key]} link={linkTo("menu", key)}>
          {items.map((item, i) => (
            <Row key={item.id} n={i + 1} name={item.name} note={item.desc} price={item.price} />
          ))}
        </Group>
      ))}

      {objects.length > 0 && (
        <Group title="Objects" link={linkTo("objects")}>
          {objects.map((o, i) => (
            <Row key={o.id} n={i + 1} name={o.name} note={o.spec} price={o.price} />
          ))}
        </Group>
      )}
    </div>
  );
}

function Group({
  title,
  link,
  children,
}: {
  title: string;
  link: { href: string; onClick: (e: React.MouseEvent) => void };
  children: React.ReactNode;
}) {
  return (
    <section className="mt-[var(--s-4)]">
      <div className="flex justify-between items-baseline mb-[var(--s-1)]">
        <h3 className={LABEL}>{title}</h3>
        <a
          {...link}
          className={`${LABEL} hover:text-[color:var(--ink)] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand)]`}
        >
          See all →
        </a>
      </div>
      {children}
    </section>
  );
}

/*
 * Three columns: number, name, price. The note sits under the name rather
 * than beside it — at phone width a third inline column either wraps badly or
 * squeezes the name, and the name is the thing being scanned.
 */
function Row({
  n,
  name,
  note,
  price,
}: {
  n: number;
  name: string;
  note?: string;
  price: number;
}) {
  return (
    <div className="grid grid-cols-[2.2rem_1fr_auto] gap-[0.9rem] items-baseline py-[0.5rem] border-b border-[color:var(--line-soft)] group">
      <span className="font-mono text-[11px] text-[color:var(--ink-muted)] tabular-nums">
        {String(n).padStart(3, "0")}
      </span>
      <span className="min-w-0">
        <span className="font-serif text-[clamp(1rem,2.4vw,1.3rem)] leading-[1.2] text-[color:var(--ink)] block">
          {name}
        </span>
        {note && (
          <span className="font-mono text-[11px] leading-[1.5] text-[color:var(--ink-muted)] block mt-[2px]">
            {note}
          </span>
        )}
      </span>
      {/* An unpriced line reads as a dash, not as 0.000 — the objects are
          seeded at zero until someone prices them. */}
      <span className="font-mono text-[13px] tabular-nums text-[color:var(--ink-muted)] whitespace-nowrap">
        {price > 0 ? formatPrice(price) : "—"}
      </span>
    </div>
  );
}
