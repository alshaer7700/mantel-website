import type { MenuItem, MenuCategoryKey, MenuCategory } from "@/app/types";
import { Shelf } from "@/app/components/Shelf";
import { BleedPlate } from "@/app/components/Plate";
import { SectionHead } from "@/app/components/SectionHead";
import { MenuList } from "@/app/components/menu/MenuList";
import { PLATES } from "@/app/content/plates";
import { LABEL } from "@/app/components/type";
import { CATEGORY_LABELS } from "@/lib/format";
import { ORDERING_OPEN } from "@/lib/constants";

/*
 * The full menu, on the shelf.
 *
 * The right-hand note under the rule says "Prices in BD" — the prototype's
 * line, and the reason MenuList prints bare numbers. Repeating "BD" on every
 * one of twelve rows is noise once it has been said at the top.
 */

type Props = {
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
  /* /menu/coffee narrows to one heading; bare /menu is everything. The
     prototype has no per-category URL, but this site already ships them and
     they are linkable and bookmarked — dropping the filter would leave the
     routes resolving to a page that ignores them. */
  category: MenuCategory;
  loading: boolean;
  error: boolean;
};

export function Cafe({ sections, category, loading, error }: Props) {
  const shown = category ? sections.filter(([key]) => key === category) : sections;
  const hasItems = shown.some(([, items]) => items.length > 0);

  return (
    <div className="pt-[clamp(3rem,9vh,6rem)]">
      <Shelf tag="Menu" note="Prices in BD">
        <SectionHead
          as="h1"
          title={category ? CATEGORY_LABELS[category] + "." : "The café."}
          aside={
            <span className={LABEL}>
              {ORDERING_OPEN ? "Add to bag · collect in 15 min" : "Ordering opens soon"}
            </span>
          }
        />

        <BleedPlate spec={PLATES.pour} className="mb-[clamp(3rem,8vh,5rem)]" />

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
          <MenuList sections={shown} />
        )}
      </Shelf>
    </div>
  );
}
