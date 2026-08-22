import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MenuItem } from "@/app/types";
import { formatPrice, formatMacros } from "@/lib/format";

/*
 * One menu item, expandable to its ingredients and nutrition.
 *
 * There is no rule under the row. A divider under every item made the menu
 * read as a spreadsheet; the only rule on the page now sits between
 * categories. What separates one item from the next is space: 24px between
 * items against 4px between a name and its own description, so the pair binds
 * and the rows stay apart. The expanded panel follows the same rule — it is
 * set apart by space and a quieter type size, not by a box or a border.
 *
 * The description is EB Garamond, not Fira Mono. Mono is for functional text —
 * a description is narrative, and setting it in a code face broke the reading
 * rhythm. The price stays mono, where the decimals line up, and so does the
 * nutrition line, which is nothing but figures.
 *
 * An item with nothing to expand renders as a plain div rather than a button:
 * a control that opens an empty panel is worse than no control, and it would
 * put a keyboard stop on every row that has no data yet.
 */
export function MenuItemRow({ item }: { item: MenuItem }) {
  const [open, setOpen] = useState(false);
  const panelId = `${useId()}-detail`;

  const macros = formatMacros(item);
  // `!== null` throughout, not truthiness: a 0 kcal still water is a real
  // published figure, and `item.calories && …` would hide it.
  const nutrition = [item.calories !== null ? `${item.calories} kcal` : "", macros]
    .filter(Boolean)
    .join(" · ");
  const expandable = Boolean(item.ingredients) || nutrition !== "";

  const header = (
    <>
      <div className="min-w-0">
        <p className="font-serif font-medium text-[length:var(--fs-item)] text-[color:var(--ink)] flex items-center gap-[6px]">
          {item.name}
          {expandable && (
            <ChevronDown
              size={13}
              strokeWidth={1.75}
              aria-hidden="true"
              className={`shrink-0 text-[color:var(--ink-muted)] transition-transform duration-200 ${
                open ? "rotate-180" : ""
              }`}
            />
          )}
        </p>
        {/* Skipped entirely when empty — an empty <p> still carried its 4px
            top margin and pushed the price off the name's baseline. */}
        {item.desc && (
          <p className="font-serif font-normal text-[length:var(--fs-desc)] leading-[1.45] text-[color:var(--ink-muted)] mt-[4px]">
            {item.desc}
          </p>
        )}
      </div>
      <span className="font-mono font-normal text-[length:var(--fs-price)] tabular-nums whitespace-nowrap ml-[var(--s-2)] text-[color:var(--ink)]">
        {formatPrice(item.price)}
      </span>
    </>
  );

  return (
    <div className="mb-[var(--s-3)]">
      {expandable ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full flex justify-between items-baseline text-left hover:opacity-60 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand)]"
        >
          {header}
        </button>
      ) : (
        <div className="flex justify-between items-baseline">{header}</div>
      )}

      {expandable && open && (
        <div id={panelId} className="mt-[var(--s-2)] pr-[var(--s-4)]">
          {item.ingredients && (
            <>
              <p className={LABEL_CLASS}>Ingredients</p>
              <p className="font-serif font-normal text-[length:var(--fs-desc)] leading-[1.45] text-[color:var(--ink)] mt-[4px]">
                {item.ingredients}
              </p>
            </>
          )}
          {nutrition && (
            <>
              <p className={`${LABEL_CLASS} ${item.ingredients ? "mt-[var(--s-2)]" : ""}`}>
                Nutrition
              </p>
              <p className="font-mono font-normal text-[length:var(--fs-price)] tabular-nums leading-[1.6] text-[color:var(--ink-muted)] mt-[4px]">
                {nutrition}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* The same micro-label as the footer column titles: mono, uppercase, tracked
   out, quiet enough to read as a caption rather than a heading. */
const LABEL_CLASS =
  "font-mono font-normal text-[length:var(--fs-copyright)] tracking-[var(--ls-copyright)] " +
  "uppercase text-[color:var(--ink-muted)]";
