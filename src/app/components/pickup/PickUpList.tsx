import { Minus, Plus } from "lucide-react";
import type { MenuItem, MenuCategoryKey } from "@/app/types";
import type { CartLine } from "@/app/content/retail";
import { formatPrice, CATEGORY_LABELS } from "@/lib/format";
import { LABEL } from "@/app/components/type";

/*
 * The Pick Up row is the Menu row's sibling, not its replacement: same mono
 * name / serif note / dotted leader / price so a customer who has already
 * scanned the Menu recognises the item instantly here. The difference is the
 * control at the end of the leader — an "Add" button in place of the Menu
 * row's ingredients disclosure, because this page's job is placing an order,
 * not reading nutrition. That is also why the two never merge into one row
 * component: layering an add-to-bag action onto MenuList would give the
 * read-only Menu a working cart control it must not have.
 */

export function PickUpList({
  sections,
  cartLines,
  loading,
  onAdd,
  onIncrement,
  onDecrement,
}: {
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
  cartLines: CartLine[];
  loading: boolean;
  onAdd: (item: MenuItem) => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
}) {
  const filled = sections.filter(([, items]) => items.length > 0);

  return (
    <div>
      {filled.map(([key, items]) => (
        <section key={key} className="mb-[52px]">
          <h3 className="font-serif font-normal text-[clamp(1.4rem,3.4vw,2rem)] tracking-[-0.01em] m-0 mb-[var(--s-2)] text-[color:var(--ink)]">
            {CATEGORY_LABELS[key]}
          </h3>
          {items.map((item) => (
            <Row
              key={item.id}
              item={item}
              quantity={cartLines.find((line) => line.product.id === item.id)?.quantity ?? 0}
              loading={loading}
              onAdd={() => onAdd(item)}
              onIncrement={() => onIncrement(item.id)}
              onDecrement={() => onDecrement(item.id)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

function Row({
  item,
  quantity,
  loading,
  onAdd,
  onIncrement,
  onDecrement,
}: {
  item: MenuItem;
  quantity: number;
  loading: boolean;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="w-full flex items-baseline gap-[0.85rem] py-[0.72rem] border-b border-[color:var(--line-soft)]">
      <span className="font-mono text-[14px] tracking-[0.01em] text-[color:var(--ink)] shrink-0">
        {item.name}
      </span>
      {item.desc && (
        <span className="font-serif italic text-[0.95rem] text-[color:var(--ink-muted)] shrink-0">
          {item.desc}
        </span>
      )}
      <span
        aria-hidden="true"
        className="flex-1 min-w-[1.5rem] border-b border-dotted border-[color:var(--line)] -translate-y-[0.28em]"
      />
      <span className="font-mono text-[13px] tabular-nums whitespace-nowrap text-[color:var(--ink-muted)]">
        {formatPrice(item.price)}
      </span>

      {quantity > 0 ? (
        <div
          className="flex items-center gap-[0.6rem] shrink-0"
          aria-label={`Quantity ${quantity}`}
        >
          <button
            type="button"
            onClick={onDecrement}
            aria-label={`Decrease ${item.name}`}
            className="text-[color:var(--ink)] hover:opacity-60 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand)]"
          >
            <Minus size={13} strokeWidth={1.5} />
          </button>
          <span className="font-mono text-[13px] tabular-nums w-[1.2em] text-center">{quantity}</span>
          <button
            type="button"
            onClick={onIncrement}
            aria-label={`Increase ${item.name}`}
            className="text-[color:var(--ink)] hover:opacity-60 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand)]"
          >
            <Plus size={13} strokeWidth={1.5} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onAdd}
          disabled={loading}
          className={`${LABEL} shrink-0 text-[color:var(--ink)] hover:opacity-60 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand)]`}
        >
          {loading ? "Loading…" : "Add +"}
        </button>
      )}
    </div>
  );
}
