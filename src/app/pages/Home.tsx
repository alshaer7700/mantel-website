import type { MenuItem, MenuCategoryKey, Page, MenuCategory } from "@/app/types";
import type { ShopObject } from "@/lib/api/objects";
import { Shelf } from "@/app/components/Shelf";
import { Plate, BleedPlate } from "@/app/components/Plate";
import { SectionHead } from "@/app/components/SectionHead";
import { MenuRow } from "@/app/components/menu/MenuList";
import { SpecCard } from "@/app/components/objects/SpecCard";
import { PLATES } from "@/app/content/plates";
import { LABEL, LABEL_INK, DISPLAY, BUTTON } from "@/app/components/type";

/*
 * The home page, on the brief's §09 structure:
 *
 *   HERO             identity, statement, primary action, the first plate
 *   INTRODUCTION     the brand in two sentences, unnumbered
 *   01 MENU PREVIEW  six lines and the way to the rest
 *   FEATURED VISUAL  one plate, full bleed, unnumbered
 *   02 SHOP          the retail range
 *   03 ORDER AHEAD   the primary action, stated as a process
 *   04 VISIT         atmosphere: the shopfront, where it is, when it opens
 *
 * TWO SECTIONS CARRY NO NUMBER ON PURPOSE. The brief asks that the page
 * change rhythm and that sections not all look identical; the introduction
 * and the featured visual are the breaks between the numbered ones. Every
 * numbered section hangs off a shelf rule, and those two do not.
 *
 * SELECTED, NOT ALL. The preview shows six lines. It replaced an index that
 * printed the entire inventory on the home page — the brief is explicit that
 * the home page should not show every product and should instead make the
 * path to the full menu clear.
 *
 * WHAT THE COPY IS. The introduction is the Story page's two sentences,
 * reused rather than rewritten: it is the shortest true statement of what
 * Mantel is, and the brief asks for a short brand statement rather than a
 * paragraph. The order-ahead section says the two things §09 names — order
 * before arriving, collect at the counter — and nothing more.
 *
 * ONE HONEST GAP. Both primary actions lead to the menu, because ordering is
 * locked in the database (EXECUTE on place_order is revoked) and there is no
 * pre-order page behind them yet. A button that opens a flow which cannot
 * complete would be worse than one that lands on the thing you would be
 * ordering from.
 */

type Props = {
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
  objects: ShopObject[];
  linkTo: (p: Page, c?: MenuCategory) => {
    href: string;
    onClick: (e: React.MouseEvent) => void;
  };
};

const PREVIEW_COUNT = 6;

export function Home({ sections, objects, linkTo }: Props) {
  /* Canonical order — the sections arrive in printed-menu order, so taking
     the first six across them is the top of the menu, not a random six. */
  const preview = sections.flatMap(([, items]) => items).slice(0, PREVIEW_COUNT);

  return (
    <>
      {/* ── hero ── */}
      <div className="pt-[clamp(3rem,9vh,6rem)]">
        <div className="flex justify-between gap-[var(--s-2)] flex-wrap">
          <span className={LABEL}>Al Hidd, Bahrain</span>
          <span className={LABEL}>Order ahead</span>
        </div>

        <h1
          className={`${DISPLAY} text-[clamp(2.9rem,10vw,8rem)] max-w-[14ch] mt-[clamp(1.5rem,5vh,3rem)] mb-[var(--s-4)] text-[color:var(--ink)]`}
        >
          Made to be <em className="italic">set down.</em>
        </h1>

        <a {...linkTo("menu")} className={`${BUTTON} inline-block mb-[clamp(2.5rem,7vh,4.5rem)]`}>
          View menu
        </a>

        <BleedPlate spec={PLATES.hero} />
      </div>

      {/* ── introduction ──
          No shelf, no number: the first of the two rhythm breaks. */}
      <section className="pt-[clamp(4rem,11vh,8rem)]">
        <p
          className={`${DISPLAY} text-[clamp(1.5rem,4vw,2.6rem)] max-w-[26ch] m-0 text-[color:var(--ink)]`}
        >
          A mantel is the shelf above a fire. We make things worth putting there.
        </p>
        <a {...linkTo("story")} className={`${LABEL_INK} inline-block mt-[var(--s-3)]`}>
          Our story →
        </a>
      </section>

      {/* ── 01 · menu preview ── */}
      <section className="pt-[clamp(4rem,11vh,8rem)]">
        <Shelf tag="01" note="Prices in BD">
          <SectionHead
            title="Café."
            aside={
              <a {...linkTo("menu")} className={LABEL_INK}>
                Full menu →
              </a>
            }
          />
          {preview.length > 0 && (
            <div className="max-w-[64ch]">
              {preview.map((item) => (
                <MenuRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </Shelf>
      </section>

      {/* ── featured visual ──
          The second rhythm break: a plate on its own, at full bleed, with
          nothing above it but air.

          Guarded, because this section is nothing BUT the plate. BleedPlate
          returns null for an unfilled plate in production, so without the
          guard the section would still contribute its top padding and leave a
          screen-height of unexplained gap between the menu and the shop —
          which reads as a broken image, the exact thing rendering nothing is
          meant to avoid. */}
      {(PLATES.room.src || import.meta.env.DEV) && (
        <section className="pt-[clamp(4rem,11vh,8rem)]">
          <BleedPlate spec={PLATES.room} />
        </section>
      )}

      {/* ── 02 · shop ── */}
      <section className="pt-[clamp(4rem,11vh,8rem)]">
        <Shelf tag="02" note="Made in small runs">
          <SectionHead
            title="Shop."
            aside={
              <a {...linkTo("shop")} className={LABEL_INK}>
                All objects →
              </a>
            }
          />
          {objects.length > 0 ? (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[clamp(1.5rem,3vw,2.5rem)]">
              {objects.map((o) => (
                <SpecCard key={o.id} object={o} />
              ))}
            </div>
          ) : (
            <p className="font-serif text-[length:var(--fs-item)] text-[color:var(--ink)]">
              The shelf is being set.
            </p>
          )}
        </Shelf>
      </section>

      {/* ── 03 · order ahead ── */}
      <section className="pt-[clamp(4rem,11vh,8rem)]">
        <Shelf tag="03">
          <SectionHead title="Order ahead." />
          {/* Two steps, numbered, because two steps is the whole process and
              writing it as a paragraph would make it sound longer than it is. */}
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(1.5rem,4vw,3rem)] max-w-[60ch] m-0 p-0 list-none">
            {[
              ["01", "Order before you arrive."],
              ["02", "Collect at the counter."],
            ].map(([n, line]) => (
              <li key={n} className="border-t border-[color:var(--line)] pt-[var(--s-2)]">
                <span className={`${LABEL} block mb-[var(--s-1)]`}>{n}</span>
                <span className="font-serif text-[length:var(--fs-item)] leading-[1.4] text-[color:var(--ink)]">
                  {line}
                </span>
              </li>
            ))}
          </ol>
          <a {...linkTo("menu")} className={`${BUTTON} inline-block mt-[var(--s-4)]`}>
            Order ahead
          </a>
        </Shelf>
      </section>

      {/* ── 04 · visit ── */}
      <section className="pt-[clamp(4rem,11vh,8rem)]">
        <Shelf tag="04">
          <SectionHead
            title="Visit."
            aside={
              <a {...linkTo("visit")} className={LABEL_INK}>
                Find us →
              </a>
            }
          />
          {/* The shopfront and the pair of interior plates, offset — the same
              hung-plate arrangement the café section used to carry. */}
          {(PLATES.facade.src || PLATES.counter.src || import.meta.env.DEV) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(1rem,3vw,2.5rem)]">
              <Plate spec={PLATES.facade} />
              <Plate spec={PLATES.counter} className="sm:mt-[clamp(2rem,8vw,5rem)]" />
            </div>
          )}
        </Shelf>
      </section>
    </>
  );
}
