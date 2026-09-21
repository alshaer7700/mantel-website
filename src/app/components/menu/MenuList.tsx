import type { MenuItem, MenuCategoryKey } from "@/app/types";
import { formatPrice, CATEGORY_LABELS } from "@/lib/format";
import { LABEL } from "@/app/components/type";

/*
 * The permanent-collection redesign: a numbered section per category, its
 * items in a two-column grid, name and price only. No descriptions, no
 * ingredients/nutrition disclosure — the design this replaced had real
 * accessibility work behind an expandable per-row panel (hover, focus, and
 * tap all handled separately; see git history), but the new design has no UI
 * for it, so it's gone rather than bolted on somewhere the design doesn't
 * show it.
 */

export function MenuList({
  sections,
}: {
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
}) {
  /* A category with nothing available is dropped rather than printed empty.
     Aqua and Desserts are in exactly that state today: every item in them is
     hidden pending a confirmed price. */
  const filled = sections.filter(([, items]) => items.length > 0);

  return (
    <div>
      {filled.map(([key, items], index) => (
        <section key={key} className="mb-[var(--air-xl)]">
          <p className={LABEL}>{String(index + 1).padStart(2, "0")} —</p>
          {/* A category is the only header on a long scroll of rows, so it
              carries its own display size rather than --fs-subsection-title,
              which on a phone resolved to about 16px — close enough to the
              13px item rows under it that the page read as one undifferentiated
              list. */}
          <h3
            className="font-grotesk font-bold uppercase text-[clamp(21px,2.4vw,29px)] tracking-[0.01em] leading-[1.02] m-0 mt-[var(--air-sm)] mb-[var(--air-md)] text-[color:var(--ink)]"
          >
            {CATEGORY_LABELS[key]}
          </h3>

          {chunk(items, 2).map((pair, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-[clamp(40px,7vw,140px)]"
            >
              {pair[0] && <Cell item={pair[0]} />}
              {pair[1] && <Cell item={pair[1]} />}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

/*
 * Name left, price right, on one line.
 *
 * The price used to sit under the name, which was the only thing that fitted
 * when the columns were narrow. They are not narrow any more — the page gave
 * the menu a lot of width — and a stacked pair left half of every column
 * empty while the rows themselves looked lost in it. On one line the row
 * spans its column, which is also how a printed menu has always done it.
 */
function Cell({ item }: { item: MenuItem }) {
  return (
    <div className="flex items-baseline justify-between gap-[var(--s-3)] py-[clamp(15px,1.7vh,24px)]">
      <p className="font-grotesk font-bold uppercase text-[clamp(13px,1.05vw,16px)] tracking-[0.04em] leading-[1.3] m-0 text-[color:var(--ink)]">
        {item.name}
      </p>
      {/* The dotted lead-in a menu uses to carry the eye across the gap. */}
      <span aria-hidden="true" className="flex-1 border-b border-dotted border-[color:var(--line)] translate-y-[-3px]" />
      <p className="font-grotesk font-medium text-[clamp(12px,0.95vw,14px)] tracking-[0.02em] tabular-nums m-0 shrink-0 text-[color:var(--ink-muted)]">
        {formatPrice(item.price)}
      </p>
    </div>
  );
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
