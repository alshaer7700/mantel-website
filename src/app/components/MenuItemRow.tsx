import type { MenuItem } from "@/app/types";
import { formatPrice } from "@/lib/format";

/*
 * One menu item. Pure display — no cart interaction.
 *
 * There is no rule under the row. A divider under every item made the menu
 * read as a spreadsheet; the only rule on the page now sits between
 * categories. What separates one item from the next is space: 24px between
 * items against 4px between a name and its own description, so the pair binds
 * and the rows stay apart.
 *
 * The description is EB Garamond, not Fira Mono. Mono is for functional text —
 * a description is narrative, and setting it in a code face broke the reading
 * rhythm. The price stays mono, where the decimals line up.
 */
export function MenuItemRow({ item }: { item: MenuItem }) {
  return (
    <div className="flex justify-between items-baseline mb-[var(--s-3)]">
      <div>
        <p className="font-serif font-medium text-[length:var(--fs-item)] text-[color:var(--ink)]">
          {item.name}
        </p>
        <p className="font-serif font-normal text-[length:var(--fs-desc)] leading-[1.45] text-[color:var(--ink-muted)] mt-[4px]">
          {item.desc}
        </p>
      </div>
      <span className="font-mono font-normal text-[length:var(--fs-price)] tabular-nums whitespace-nowrap ml-[var(--s-2)] text-[color:var(--ink)]">
        {formatPrice(item.price)}
      </span>
    </div>
  );
}
