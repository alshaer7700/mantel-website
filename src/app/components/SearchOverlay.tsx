import { X, Search } from "lucide-react";
import type { RefObject } from "react";
import type { MenuItem, MenuCategoryKey } from "@/app/types";
import { MENU_CATEGORIES } from "@/app/types";
import { CATEGORY_LABELS, formatPrice } from "@/lib/format";
import { LABEL } from "@/app/components/type";

/*
 * Search, as a full-width panel across the top of the page rather than a
 * rounded box floating in the middle of it.
 *
 * The shape follows the reference: one rule-to-rule field, and underneath it
 * two columns — somewhere to go when you have not typed anything yet, and a
 * few things worth looking at. An empty search box that offers nothing is a
 * dead end; the point of the suggestions is that the panel is useful on the
 * first frame, before a single keystroke.
 *
 * What the reference has and this does not: product photography in the
 * suggestions. There is none yet, so the right column is set as type. It will
 * take images when `image_url` is filled without changing this layout.
 */

type Props = {
  query: string;
  setQuery: (q: string) => void;
  /** Items matching the query. Empty when nothing is typed. */
  results: MenuItem[];
  /** Everything available, for the pre-typing suggestions. */
  allItems: MenuItem[];
  inputRef: RefObject<HTMLInputElement>;
  onClose: () => void;
  onPickCategory: (c: MenuCategoryKey) => void;
  navHeight: string;
};

export function SearchOverlay({
  query,
  setQuery,
  results,
  allItems,
  inputRef,
  onClose,
  onPickCategory,
  navHeight,
}: Props) {
  const typing = query.trim() !== "";

  /* Only headings that actually have something under them. Aqua and Desserts
     are empty today (every item hidden pending a price), and a chip leading to
     an empty page is worse than no chip. */
  const browsable = MENU_CATEGORIES.filter((c) => allItems.some((i) => i.category === c));

  return (
    <div
      className="fixed inset-x-0 z-50 bg-[color:var(--bg)] border-b border-[color:var(--line)]"
      style={{ top: navHeight }}
      role="dialog"
      aria-label="Search"
    >
      {/* The field, rule to rule. */}
      <div className="flex items-center gap-[var(--s-2)] px-[var(--pad)] py-[var(--s-2)] border-y border-[color:var(--line)]">
        <Search size={16} strokeWidth={1.5} className="text-[color:var(--ink-muted)] shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-0 bg-transparent border-0 outline-none font-mono text-[14px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-muted)]"
        />
        <button
          onClick={onClose}
          aria-label="Close search"
          className="shrink-0 text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition-colors border border-[color:var(--line)] p-1"
        >
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="px-[var(--pad)] py-[var(--s-4)] max-h-[60vh] overflow-y-auto">
        {typing ? (
          <Results results={results} onPickCategory={onPickCategory} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[var(--s-4)]">
            <div>
              <p className={`${LABEL} mb-[var(--s-2)]`}>Browse</p>
              <div className="flex flex-wrap gap-[var(--s-1)]">
                {browsable.map((c) => (
                  <button
                    key={c}
                    onClick={() => onPickCategory(c)}
                    className="font-mono text-[12px] tracking-[0.08em] uppercase text-[color:var(--ink)] border border-[color:var(--line)] px-[var(--s-2)] py-[6px] hover:border-[color:var(--ink)] transition-colors"
                  >
                    {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className={`${LABEL} mb-[var(--s-2)]`}>On the menu</p>
              <div className="flex flex-col">
                {allItems.slice(0, 5).map((item) => (
                  <ItemRow key={item.id} item={item} onPickCategory={onPickCategory} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Results({
  results,
  onPickCategory,
}: {
  results: MenuItem[];
  onPickCategory: (c: MenuCategoryKey) => void;
}) {
  if (results.length === 0) {
    return (
      <p className="font-mono text-[14px] text-[color:var(--ink-muted)] py-[var(--s-2)]">
        Nothing under that name.
      </p>
    );
  }
  return (
    <div className="flex flex-col max-w-[720px]">
      {results.map((item) => (
        <ItemRow key={item.id} item={item} onPickCategory={onPickCategory} />
      ))}
    </div>
  );
}

/* The menu's own row, cut down: name, leader, price. Consistency with the
   menu matters more here than inventing a second way to print an item. */
function ItemRow({
  item,
  onPickCategory,
}: {
  item: MenuItem;
  onPickCategory: (c: MenuCategoryKey) => void;
}) {
  return (
    <button
      onClick={() => onPickCategory(item.category)}
      className="w-full flex items-baseline gap-[0.85rem] py-[0.6rem] text-left border-b border-[color:var(--line-soft)] transition-[padding-left] duration-300 ease-[cubic-bezier(.16,.84,.44,1)] hover:pl-[0.5rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand)]"
    >
      <span className="font-mono text-[14px] text-[color:var(--ink)] shrink-0">{item.name}</span>
      <span className={`${LABEL} shrink-0`}>{CATEGORY_LABELS[item.category]}</span>
      <span
        aria-hidden="true"
        className="flex-1 min-w-[1.5rem] border-b border-dotted border-[color:var(--line)] -translate-y-[0.28em]"
      />
      <span className="font-mono text-[13px] tabular-nums text-[color:var(--ink-muted)] shrink-0">
        {formatPrice(item.price)}
      </span>
    </button>
  );
}
