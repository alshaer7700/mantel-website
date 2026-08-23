import type { MenuItem, MenuCategoryKey, MenuCategory } from "@/app/types";
import { Shelf } from "@/app/components/Shelf";
import { BleedPlate } from "@/app/components/Plate";
import { SectionHead } from "@/app/components/SectionHead";
import { MenuList } from "@/app/components/menu/MenuList";
import { PLATES } from "@/app/content/plates";
import { CATEGORY_LABELS } from "@/lib/format";

/*
 * The full menu, on the shelf: names and prices.
 *
 * "Prices in BD" is the only thing hanging off the rule, and it is the one
 * piece of copy on this page that is not a name or a number. It stays because
 * it is what makes the numbers prices — MenuList prints bare figures, so
 * without this line the column is twenty-three unlabelled decimals. Repeating
 * "BD" on every row is the noise it exists to avoid.
 *
 * The right-hand note that used to sit beside it ("Ready in 15 minutes." when
 * ordering opens, "Ordering opens soon" while it is locked) is gone.
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
      <Shelf tag="Prices in BD">
        <SectionHead as="h1" title={category ? CATEGORY_LABELS[category] + "." : "Café."} />

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
