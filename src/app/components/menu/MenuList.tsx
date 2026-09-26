import type { MenuItem, MenuCategoryKey } from "@/app/types";
import { formatPrice, CATEGORY_LABELS } from "@/lib/format";
import { LABEL, SYSTEM_SANS } from "@/app/components/type";

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
        <section key={key} className="mb-[clamp(3rem,8vh,5rem)]">
          <p className={LABEL}>{String(index + 1).padStart(2, "0")} —</p>
          <h3
            style={{ fontFamily: SYSTEM_SANS }}
            className="font-medium uppercase text-[length:clamp(28px,4.5vw,44px)] tracking-[-0.01em] leading-[1.02] m-0 mt-[10px] mb-[28px] text-[color:var(--ink)]"
          >
            {CATEGORY_LABELS[key]}
          </h3>

          {chunk(items, 2).map((pair, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-[48px]"
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

function Cell({ item }: { item: MenuItem }) {
  return (
    <div className="py-[18px]">
      <p
        style={{ fontFamily: SYSTEM_SANS }}
        className="font-medium text-[13px] tracking-[-0.005em] leading-[1.3] m-0 text-[color:var(--ink)]"
      >
        {item.name}
      </p>
      <p
        style={{ fontFamily: SYSTEM_SANS }}
        className="text-[12px] tracking-[-0.005em] tabular-nums m-0 mt-[4px] text-[color:var(--ink-muted)]"
      >
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
