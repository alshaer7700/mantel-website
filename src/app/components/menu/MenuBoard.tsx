import { useState } from "react";
import type { MenuItem, MenuCategoryKey, MenuCategory, Page } from "@/app/types";
import { CATEGORY_LABELS, formatPrice } from "@/lib/format";
import { CATEGORY_THEME } from "@/app/content/menuTheme";
import { CategoryArt } from "@/app/components/menu/CategoryArt";
import { LABEL } from "@/app/components/type";

/*
 * The menu board: one panel per heading, side by side, and the panel under the
 * pointer opens.
 *
 * The interaction, and what each part of it is for:
 *
 *   closed   index, heading, one line of note, a "view" pill. Paper ground,
 *            ink text, hairline between panels. This is the whole menu at a
 *            glance — five headings, no scrolling, nothing hidden behind a tap.
 *   open     the panel takes roughly two and a half panels' width, floods with
 *            the heading's colour, the drawing rises into it, and the text
 *            drops to the foot of the panel in paper. One panel is open at a
 *            time; nothing else on the page moves.
 *   chosen   clicking it goes to /menu/<heading>, where the spread takes over.
 *
 * THE PANEL IS AN ANCHOR, not a div with a click handler, and that is the only
 * reason this works on a keyboard. Tab moves through the headings, focus opens
 * the panel exactly as hover does (`onFocus` sets the same state), and Enter
 * follows the link. A pointer-only version of this interaction would leave the
 * menu unreadable to anyone not using a mouse — which, on a café menu, is most
 * people.
 *
 * Below md the row becomes a column and the open state stops meaning anything:
 * there is no hover on a touch screen, and an accordion that needs one tap to
 * open and a second to follow is a worse way to read five headings than a list
 * of five headings. So the panels stack, each shows its closed face at a
 * readable height, and one tap goes straight to the spread.
 */

type Props = {
  linkTo: (page: Page, category?: MenuCategory) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
};

export function MenuBoard({ linkTo, sections }: Props) {
  /* Which panel is open — set by both pointer and focus, cleared by both.
     `null` is the resting state, where every panel is equal. */
  const [open, setOpen] = useState<MenuCategoryKey | null>(null);

  return (
    <div
      className="
        flex flex-col md:flex-row overflow-hidden
        border border-[color:var(--line)] bg-[color:var(--card-surface)]
        md:h-[clamp(20rem,54vh,30rem)]
      "
    >
      {sections.map(([key, items], index) => {
        const theme = CATEGORY_THEME[key];
        const isOpen = open === key;

        return (
          <a
            key={key}
            {...linkTo("menu", key)}
            onMouseEnter={() => setOpen(key)}
            onMouseLeave={() => setOpen((current) => (current === key ? null : current))}
            onFocus={() => setOpen(key)}
            onBlur={() => setOpen((current) => (current === key ? null : current))}
            style={{
              /* The one animated property. Growing flex rather than setting a
                 width keeps the panels filling the row exactly at every frame
                 of the transition — widths in percentages leave a gap. */
              flexGrow: isOpen ? 2.6 : 1,
              background: isOpen ? theme.deep : "transparent",
              color: isOpen ? "var(--paper)" : "var(--ink)",
            }}
            className="
              group relative flex-1 basis-0 min-w-0 overflow-hidden
              flex flex-col
              min-h-[9.5rem] md:min-h-0
              p-[var(--s-3)] no-underline
              border-b last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0
              border-[color:var(--line-soft)]
              transition-[flex-grow,background-color,color] duration-[600ms]
              ease-[cubic-bezier(.2,.8,.2,1)]
              focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-[6px]
              focus-visible:outline-[color:var(--brand)]
            "
          >
            {/* The drawing. Present in both states so there is nothing to mount
                mid-transition: it sits behind the text at a whisper, and rises
                and clears as the panel opens. Absolute so growing it never
                pushes the heading around. */}
            <span
              aria-hidden="true"
              style={{
                opacity: isOpen ? 0.9 : 0.16,
                transform: isOpen ? "translateY(0) scale(1)" : "translateY(14px) scale(0.82)",
              }}
              className="
                pointer-events-none absolute right-[var(--s-3)] top-[var(--s-3)]
                w-[clamp(5rem,9vw,8.5rem)] aspect-square
                transition-[opacity,transform] duration-[600ms] ease-[cubic-bezier(.2,.8,.2,1)]
              "
            >
              <CategoryArt artKey={theme.art} />
            </span>

            {/* The drift. A closed panel sets its heading around the middle of
                the column; an open one sets it at the foot. justify-content
                cannot be transitioned, so the free space is held by two
                spacers instead and the lower one is animated to nothing —
                which the browser does interpolate, on the same curve and over
                the same 600ms as the width.

                On a phone, where the panels stack and none of them opens, the
                two spacers simply centre the text in a 9.5rem row. */}
            <span aria-hidden="true" className="flex-1" />

            <span className="relative flex flex-col gap-[6px]">
              <span
                className={LABEL}
                style={{ color: isOpen ? "rgba(246,245,242,.72)" : undefined }}
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <span className="font-serif text-[clamp(1.5rem,2.4vw,2.1rem)] leading-[1.05] tracking-[-0.018em]">
                {CATEGORY_LABELS[key]}
              </span>

              {/* Two lines reserved whether the note fills them or not, so
                  the five headings sit on one line across the board instead of
                  stepping up and down with the length of their captions. */}
              <span
                className="
                  font-mono text-[11px] leading-[1.5] max-w-[26ch]
                  min-h-[33px] line-clamp-2
                "
                style={{ color: isOpen ? "rgba(246,245,242,.78)" : "var(--ink-muted)" }}
              >
                {theme.note}
              </span>

              <span className="flex items-center gap-[var(--s-2)] pt-[var(--s-2)]">
                <span
                  style={{ borderColor: isOpen ? "rgba(246,245,242,.45)" : "var(--line)" }}
                  className="
                    inline-flex items-center gap-[6px] rounded-full border
                    px-[14px] py-[6px]
                    font-mono text-[10px] tracking-[0.2em] uppercase leading-none
                    transition-colors duration-[600ms]
                  "
                >
                  View
                  <span aria-hidden="true">→</span>
                </span>

                {/* The count, not the prices: the board is the contents page,
                    and a column of numbers here would make it a second menu
                    competing with the spread. */}
                <span
                  className="font-mono text-[10px] tracking-[0.2em] uppercase leading-none"
                  style={{ color: isOpen ? "rgba(246,245,242,.6)" : "var(--ink-muted)" }}
                >
                  {items.length} {items.length === 1 ? "item" : "items"}
                </span>
              </span>
            </span>

            <span
              aria-hidden="true"
              style={{ flexGrow: isOpen ? 0 : 0.85 }}
              className="transition-[flex-grow] duration-[600ms] ease-[cubic-bezier(.2,.8,.2,1)]"
            />
          </a>
        );
      })}
    </div>
  );
}

/*
 * The one line under the board: the cheapest thing on the menu and the dearest,
 * so the board answers "what does a coffee here cost" without opening anything.
 *
 * Exported from this file rather than inlined in the page because it reads the
 * same `sections` the board does and has to agree with it — if a heading is
 * dropped for being empty, this range must drop with it.
 */
export function PriceRange({
  sections,
}: {
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
}) {
  const prices = sections.flatMap(([, items]) => items.map((item) => item.price));
  if (prices.length === 0) return null;

  const low = Math.min(...prices);
  const high = Math.max(...prices);

  return (
    <p className={`${LABEL} m-0`}>
      {low === high
        ? `All items ${formatPrice(low)} BD`
        : `${formatPrice(low)} — ${formatPrice(high)} BD`}
    </p>
  );
}
