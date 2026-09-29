import type { MenuItem, MenuCategoryKey, MenuCategory, Page } from "@/app/types";
import type { CartLine } from "@/app/content/retail";
import { Shelf } from "@/app/components/Shelf";
import { SectionHead } from "@/app/components/SectionHead";
import { PickUpList } from "@/app/components/pickup/PickUpList";
import { LABEL } from "@/app/components/type";
import { PICKUP_OPEN } from "@/lib/constants";
import type { PAGE_DEFAULTS } from "@/lib/content/pages";

/*
 * Order Before Reach: the only place on the site where a café item can be
 * added to a bag. The Menu page (Cafe.tsx) is deliberately read-only — see
 * its MenuList comment — so this page carries the cart wiring the Menu
 * intentionally does not. Same sections, same rows, same prices; the
 * difference is the control at the end of each row.
 */

type Props = {
  linkTo: (page: Page, category?: MenuCategory) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
  loading: boolean;
  error: boolean;
  cartLines: CartLine[];
  onAdd: (item: MenuItem) => void;
  onIncrement: (id: string) => void;
  onDecrement: (id: string) => void;
  content: (typeof PAGE_DEFAULTS)["pickup"];
};

export function PickUp({ linkTo, sections, loading, error, cartLines, onAdd, onIncrement, onDecrement, content }: Props) {
  const hasItems = sections.some(([, items]) => items.length > 0);
  const itemCount = cartLines.reduce((total, line) => total + line.quantity, 0);

  /*
   * Not open yet. The page still exists and still says what it is — the nav
   * links here, and a link that lands on nothing is worse than one that lands
   * on an explanation. What it does not do is show a menu with buttons that
   * would take an order nobody is ready to fill.
   */
  if (!PICKUP_OPEN) {
    return (
      <div className="editorial-soon">
        <p className="editorial-overline">{content.soon_overline}</p>
        <h1>{content.soon_title}</h1>
        <p className="editorial-soon-copy">{content.soon_text}</p>
        <div className="editorial-inline-links">
          <a {...linkTo("menu")} className="editorial-link">View the menu</a>
          <a {...linkTo("contact")} className="editorial-link">Contact us</a>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-[clamp(3rem,9vh,6rem)]">
      <Shelf tag="Order before reach" note="Prices in BD">
        <SectionHead
          as="h1"
          title={content.title}
          aside={
            <a {...linkTo("menu")} className={`${LABEL} editorial-menu-retail-link`}>
              View the full menu <span aria-hidden="true">↗</span>
            </a>
          }
        />

        <p className="font-serif text-[1rem] text-[color:var(--ink-muted)] max-w-[46ch] mb-[clamp(2rem,6vh,3.5rem)]">
          {content.text}{" "}
          {itemCount > 0 && (
            <span className="font-mono text-[13px] tracking-[0.02em] text-[color:var(--ink)]">
              {itemCount} item{itemCount === 1 ? "" : "s"} in your bag.
            </span>
          )}
        </p>

        {loading ? (
          <p className="font-mono text-[14px] text-[color:var(--ink-muted)] py-[var(--s-5)]">
            Loading…
          </p>
        ) : error ? (
          <p className="font-mono text-[14px] text-[color:var(--ink-muted)] py-[var(--s-5)]">
            Couldn't load the menu right now — please try again shortly.
          </p>
        ) : !hasItems ? (
          <p className="font-mono text-[14px] text-[color:var(--ink-muted)] py-[var(--s-5)]">
            The menu is being set.
          </p>
        ) : (
          <PickUpList
            sections={sections}
            cartLines={cartLines}
            loading={loading}
            onAdd={onAdd}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
          />
        )}
      </Shelf>
    </div>
  );
}
