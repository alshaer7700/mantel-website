import type { MenuItem, MenuCategoryKey, MenuCategory } from "@/app/types";
import { BleedPlate } from "@/app/components/Plate";
import { MenuList } from "@/app/components/menu/MenuList";
import { PLATES } from "@/app/content/plates";

/*
 * The permanent-collection cover: a centered "Menu" in place of the old
 * shelf-rule heading. Category filtering (/menu/coffee etc.) still narrows
 * `sections` — see routes.ts — it just no longer changes this title, since
 * the design has one fixed cover regardless of which slice is showing.
 */

type Props = {
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
  category: MenuCategory;
  loading: boolean;
  error: boolean;
};

export function Cafe({ sections, category, loading, error }: Props) {
  const shown = category ? sections.filter(([key]) => key === category) : sections;
  const hasItems = shown.some(([, items]) => items.length > 0);

  return (
    <div>
      <header className="text-center pt-[clamp(2.5rem,7vh,4rem)] pb-[clamp(2rem,6vh,3.5rem)]">
        <h1 className="font-serif font-bold uppercase text-[length:calc(var(--fs-section-title)*0.8)] tracking-[-0.01em] leading-[0.96] m-0 text-[color:var(--ink)]">
          Menu
        </h1>
      </header>

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
    </div>
  );
}
