import type { MenuItem, MenuCategoryKey, MenuCategory, Page } from "@/app/types";
import { MenuBoard, PriceRange } from "@/app/components/menu/MenuBoard";
import { CategorySpread } from "@/app/components/menu/CategorySpread";
import { LABEL, LABEL_INK } from "@/app/components/type";
import { ORDERING_OPEN, PICKUP_OPEN } from "@/lib/constants";

/*
 * The Menu page, in two states, both of which are real URLs:
 *
 *   /menu          the board — every heading at once, the one under the
 *                  pointer opened.
 *   /menu/coffee   the spread — that heading flooded across the page, its
 *                  items set in display type one at a time.
 *
 * The category has always been in the path (see routes.ts); before this it only
 * filtered a list, so the two states looked near enough identical that the URL
 * was not worth having. Now /menu/coffee is a different page, and Back between
 * the two is the browser's own, not a piece of component state pretending.
 *
 * Browsing only. Nothing on either state adds to a bag — ordering lives on
 * Order Before Reach, and the only link across to it is the one on the spread.
 * The old MenuList (a printed two-column list per heading) is gone rather than
 * kept behind a toggle: two ways to read the same menu is one menu too many.
 */

type Props = {
  linkTo: (page: Page, category?: MenuCategory) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
  category: MenuCategory;
  loading: boolean;
  error: boolean;
};

export function Cafe({ linkTo, sections, category, loading, error }: Props) {
  /* A heading with nothing available is dropped rather than printed empty —
     Aqua and Desserts are in exactly that state today, every item in them
     hidden pending a confirmed price. Dropping them here rather than inside
     the board is what keeps the 01–0N numbering contiguous. */
  const filled = sections.filter(([, items]) => items.length > 0);
  const open = filled.find(([key]) => key === category);

  if (loading || error || filled.length === 0) {
    return (
      <div className="pt-[clamp(2.5rem,7vh,4rem)]">
        <Cover linkTo={linkTo} />
        <p className="font-mono text-[14px] text-[color:var(--ink-muted)] py-[var(--s-5)]">
          {loading
            ? "Loading…"
            : error
              ? "Couldn't load the menu right now — please try again shortly."
              : "The menu is being set."}
        </p>
      </div>
    );
  }

  /* A slug that resolves to a heading with nothing in it — /menu/desserts
     today — falls back to the board rather than to an empty plate. routeFor
     already does this for a slug that is not a heading at all; this is the
     same degradation one step later, once the counts are known. */
  if (open) {
    return <CategorySpread linkTo={linkTo} category={open[0]} items={open[1]} />;
  }

  return (
    <div className="pt-[clamp(2.5rem,7vh,4rem)] pb-[clamp(3rem,8vh,5rem)]">
      <Cover linkTo={linkTo} />
      <MenuBoard linkTo={linkTo} sections={filled} />
      <div className="flex justify-between gap-[var(--s-3)] pt-[var(--s-2)]">
        <PriceRange sections={filled} />
        {/* Only where there is a pointer to hover with. On a touch screen the
            panels do not open at all (see MenuBoard), so the hint would be an
            instruction for an interaction that is not there. */}
        <p className={`${LABEL} m-0 hidden md:block`}>Hover a heading</p>
      </div>
    </div>
  );
}

function Cover({ linkTo }: Pick<Props, "linkTo">) {
  return (
    <header className="text-center pb-[clamp(2rem,6vh,3.5rem)]">
      <h1 className="font-serif font-bold uppercase text-[length:var(--fs-section-title)] tracking-[-0.01em] leading-[0.96] m-0 text-[color:var(--ink)]">
        Menu
      </h1>
      <div aria-hidden="true" className="mx-auto mt-[26px] mb-[16px] w-px h-[34px] bg-[color:var(--line)]" />
      <p className={LABEL}>
        Permanent collection · Prices in BD
        {ORDERING_OPEN && PICKUP_OPEN && (
          <>
            {" · "}
            <a {...linkTo("pickup")} className={LABEL_INK}>
              Order before reach <span aria-hidden="true">↗</span>
            </a>
          </>
        )}
      </p>
    </header>
  );
}
