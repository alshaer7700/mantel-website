import { useEffect, useState } from "react";
import type { MenuItem, MenuCategoryKey, MenuCategory, Page } from "@/app/types";
import { CATEGORY_LABELS, formatBD, formatMacros } from "@/lib/format";
import { CATEGORY_THEME } from "@/app/content/menuTheme";
import { CategoryArt } from "@/app/components/menu/CategoryArt";
import { LABEL } from "@/app/components/type";
import { ORDERING_OPEN, PICKUP_OPEN } from "@/lib/constants";

/*
 * One heading, opened: the page washes to the heading's tint, a plate of its
 * full colour fills the screen, and the item under the cursor is set in display
 * type across it.
 *
 * The spread is BROWSING, not ordering — that division is the point of the
 * Menu page and is set out in ux-changes.md. There is no add button, no
 * quantity, no price total. The single call to action is the link to Order
 * Before Reach, and it only appears when ordering is actually open, so the page
 * never offers a door that is locked.
 *
 * Selecting an item does not navigate. The URL carries the heading
 * (/menu/coffee) because a heading is worth linking to; which of five drinks
 * is currently set in the display type is not, and pushing a history entry per
 * hover would bury the Back button under the menu.
 */

type Props = {
  linkTo: (page: Page, category?: MenuCategory) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
  category: MenuCategoryKey;
  items: MenuItem[];
};

export function CategorySpread({ linkTo, category, items }: Props) {
  const theme = CATEGORY_THEME[category];

  /* Index, not id: the id survives a category change that the index does not,
     which is the bug. Moving from Coffee to Sandwiches must land on the first
     sandwich, and an id held over from the coffee list would match nothing and
     render an empty plate. Resetting on `category` is what the effect is for. */
  const [selected, setSelected] = useState(0);
  useEffect(() => setSelected(0), [category]);

  /* The wash: the whole page takes the heading's tint for as long as the
     spread is open, nav and footer included, and goes back to paper on the way
     out. --page-wash is read by --background in theme.css, which is what every
     bg-background in the tree resolves to, so one property repaints the page.

     The cleanup is the important half. Without it, leaving the spread by any
     route that does not unmount through this effect — Back, a nav link, the
     logo — would leave the site washed green on every other page. */
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--page-wash", theme.tint);
    return () => {
      root.style.removeProperty("--page-wash");
    };
  }, [theme.tint]);

  const item = items[Math.min(selected, items.length - 1)];
  if (!item) return null;

  const macros = formatMacros(item);

  return (
    <div className="pb-[clamp(3rem,8vh,5rem)]">
      <header className="flex items-baseline justify-between gap-[var(--s-3)] py-[clamp(1.5rem,4vh,2.5rem)]">
        <a
          {...linkTo("menu")}
          className="
            font-mono text-[11px] tracking-[0.2em] uppercase leading-[1.4]
            text-[color:var(--ink)] no-underline hover:opacity-60 transition-opacity
            focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4
            focus-visible:outline-[color:var(--brand)]
          "
        >
          <span aria-hidden="true">←</span> All headings
        </a>
        <p className={`${LABEL} m-0 hidden sm:block`}>{theme.note}</p>
      </header>

      {/* ── The plate ──────────────────────────────────────────────────────── */}
      <div
        style={{ background: theme.deep, color: "var(--paper)" }}
        className="
          relative overflow-hidden
          grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto]
          gap-[var(--s-3)] md:gap-[var(--s-4)]
          p-[clamp(1.25rem,3vw,2.5rem)]
          pt-[clamp(11rem,34vw,14rem)] md:pt-[clamp(1.25rem,3vw,2.5rem)]
          min-h-0 md:min-h-[clamp(24rem,64vh,38rem)]
          transition-colors duration-[700ms] ease-[cubic-bezier(.2,.8,.2,1)]
        "
      >
        {/* The wordmark. aria-hidden because the same name is set, once, as the
            heading below it — without that a screen reader reads every item
            name twice, the second time as a stray word with no context.
            Sized from the name's own length so "V60" and "Salted Vanilla
            Matcha" both fill the plate instead of one of them overflowing it. */}
        <span
          aria-hidden="true"
          key={item.id}
          style={{
            fontSize: `clamp(2.75rem, ${wordmarkVw(item.name)}vw, 13rem)`,
            color: "rgba(246,245,242,.16)",
          }}
          className="
            pointer-events-none absolute inset-x-[clamp(1.25rem,3vw,2.5rem)]
            top-[clamp(5.5rem,17vw,7rem)] md:top-1/2 md:-translate-y-1/2
            font-serif leading-[0.86] tracking-[-0.03em] whitespace-nowrap
            [animation:plate-reveal_700ms_cubic-bezier(.2,.8,.2,1)_both]
          "
        >
          {item.name}
        </span>

        <span
          aria-hidden="true"
          className="
            pointer-events-none absolute left-1/2 -translate-x-1/2
            top-[clamp(1.5rem,5vw,2.5rem)] md:top-1/2 md:-translate-y-1/2
            w-[clamp(8rem,26vw,22rem)] aspect-square opacity-70
          "
        >
          <CategoryArt artKey={theme.art} />
        </span>

        {/* ── The item, in words ── */}
        <div
          aria-live="polite"
          className="relative self-end flex flex-col gap-[var(--s-2)] max-w-[34ch]"
        >
          <span className="font-mono text-[11px] tracking-[0.2em] uppercase leading-[1.4] text-[rgba(246,245,242,.66)]">
            {CATEGORY_LABELS[category]} / {String(selected + 1).padStart(2, "0")}
          </span>

          <h2 className="font-serif font-normal text-[clamp(1.75rem,3.4vw,2.75rem)] leading-[1.02] tracking-[-0.018em] m-0">
            {item.name}
          </h2>

          {item.desc && (
            <p className="font-mono text-[13px] leading-[1.6] m-0 text-[rgba(246,245,242,.82)]">
              {item.desc}
            </p>
          )}

          <p className="font-mono text-[length:var(--fs-price)] tabular-nums m-0 pt-[var(--s-1)]">
            {formatBD(item.price)}
          </p>

          {/* Nutrition, when it has been published. Every figure is checked
              against null rather than falsiness: 0 g of fat is a measurement,
              and a truthiness check would hide it. */}
          {(item.ingredients || item.calories !== null || macros) && (
            <dl className="m-0 mt-[var(--s-1)] flex flex-col gap-[4px] font-mono text-[11px] leading-[1.5] text-[rgba(246,245,242,.72)]">
              {item.ingredients && (
                <div className="flex gap-[var(--s-1)]">
                  <dt className="tracking-[0.2em] uppercase shrink-0">In it</dt>
                  <dd className="m-0">{item.ingredients}</dd>
                </div>
              )}
              {item.calories !== null && (
                <div className="flex gap-[var(--s-1)]">
                  <dt className="tracking-[0.2em] uppercase shrink-0">Kcal</dt>
                  <dd className="m-0 tabular-nums">{item.calories}</dd>
                </div>
              )}
              {macros && (
                <div className="flex gap-[var(--s-1)]">
                  <dt className="tracking-[0.2em] uppercase shrink-0">Macros</dt>
                  <dd className="m-0">{macros}</dd>
                </div>
              )}
            </dl>
          )}

          {ORDERING_OPEN && PICKUP_OPEN && (
            <a
              {...linkTo("pickup")}
              className="
                self-start mt-[var(--s-2)]
                inline-flex items-center gap-[8px] rounded-full
                border border-[rgba(246,245,242,.5)] px-[18px] py-[9px]
                font-mono text-[10px] tracking-[0.2em] uppercase leading-none
                text-[color:var(--paper)] no-underline
                hover:bg-[rgba(246,245,242,.12)] transition-colors
                focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4
                focus-visible:outline-[color:var(--paper)]
              "
            >
              Order before reach
              <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>

        {/* ── The rail ──
            The video this follows puts its size options in a column down the
            right edge; here the same column is the heading's items, which is
            what a café menu has instead of 250ml and 500ml. On a phone it
            becomes a scrollable row under the plate, because a column of eight
            buttons down the side of a 360px screen leaves no plate. */}
        <div
          className="
            relative flex md:flex-col items-start gap-[var(--s-1)] md:self-center
            overflow-x-auto md:overflow-visible
            -mx-[clamp(1.25rem,3vw,2.5rem)] md:mx-0 px-[clamp(1.25rem,3vw,2.5rem)] md:px-0
            [scrollbar-width:none] [&::-webkit-scrollbar]:hidden
          "
        >
          {items.map((each, index) => {
            const active = each.id === item.id;
            return (
              <button
                key={each.id}
                type="button"
                aria-pressed={active}
                onMouseEnter={() => setSelected(index)}
                onFocus={() => setSelected(index)}
                onClick={() => setSelected(index)}
                style={{
                  background: active ? "var(--paper)" : "transparent",
                  color: active ? "var(--ink)" : "var(--paper)",
                  borderColor: active ? "var(--paper)" : "rgba(246,245,242,.35)",
                }}
                className="
                  shrink-0 whitespace-nowrap rounded-full border
                  px-[14px] py-[8px]
                  font-mono text-[10px] tracking-[0.16em] uppercase leading-none
                  text-left transition-colors duration-200
                  focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4
                  focus-visible:outline-[color:var(--paper)]
                "
              >
                {each.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/*
 * The wordmark's fluid size, in vw, from the length of the name it has to set.
 *
 * A single clamp() cannot do this: one tuned for "V60" sets "Salted Vanilla
 * Matcha" three panels wide, and one tuned for the long name leaves the short
 * one a rounding error in the middle of the plate. The constant is the width
 * of a character in this face as a fraction of its size — measured off EB
 * Garamond at display size, not derived — and the cap keeps a three-letter
 * name from filling the plate edge to edge.
 */
function wordmarkVw(name: string): number {
  return Math.min(15, 84 / (name.length * 0.46));
}
