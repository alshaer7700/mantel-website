import type { MenuItem, MenuCategoryKey, Page, MenuCategory } from "@/app/types";
import type { ShopObject } from "@/lib/api/objects";
import { Shelf } from "@/app/components/Shelf";
import { Plate, BleedPlate } from "@/app/components/Plate";
import { SectionHead } from "@/app/components/SectionHead";
import { Index } from "@/app/components/Index";
import { SpecCard } from "@/app/components/objects/SpecCard";
import { PLATES } from "@/app/content/plates";
import { LABEL, LABEL_INK, DISPLAY } from "@/app/components/type";
import { ORDERING_OPEN } from "@/lib/constants";

/*
 * The home page: a type hero, then two numbered sections hanging off a shelf
 * rule — the café and the objects.
 *
 * WHAT WAS CUT, and why the page is better for it:
 *
 *  - The hero's sub-paragraph ("A café and a small house of objects…"). The
 *    headline and the eyebrow above it already say that; the paragraph was
 *    the same sentence in a quieter voice.
 *
 *  - Section 03, "The name" — the mantel-is-the-shelf-above-a-fire passage.
 *    It was the Story page, restated on the home page, with the Story page
 *    linked underneath it. One of the two had to go and it was not the page
 *    whose whole job it is.
 *
 *  - Two-line section headings. "Poured to order, never to impress." and
 *    "Things worth keeping after." became "Café." and "Objects." A section
 *    that already carries a shelf tag, a number and an index beneath it does
 *    not need a slogan to introduce itself.
 *
 * The eyebrow still reads "Ordering opens soon" rather than the prototype's
 * "Order ahead · Collect at the counter": ordering is locked, so the second
 * is a promise the site cannot keep.
 *
 * "Est. 2026" is on evidence, not assumption — the year is printed on the
 * matcha pouch and the iced cup, alongside "Hidd, Kingdom of Bahrain".
 */

type Props = {
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
  objects: ShopObject[];
  linkTo: (p: Page, c?: MenuCategory) => {
    href: string;
    onClick: (e: React.MouseEvent) => void;
  };
};

export function Home({ sections, objects, linkTo }: Props) {

  return (
    <>
      {/* ── hero ── */}
      <div className="pt-[clamp(3rem,9vh,6rem)]">
        <div className="flex justify-between gap-[var(--s-2)] flex-wrap">
          <span className={LABEL}>Mantel — Hidd, Kingdom of Bahrain</span>
          <span className={LABEL}>
            {ORDERING_OPEN ? "Order ahead · Collect at the counter" : "Ordering opens soon"}
          </span>
        </div>

        <h1
          className={`${DISPLAY} text-[clamp(2.9rem,10vw,8rem)] max-w-[14ch] mt-[clamp(1.5rem,5vh,3rem)] mb-[clamp(2.5rem,7vh,4.5rem)] text-[color:var(--ink)]`}
        >
          Made to be <em className="italic">set down.</em>
        </h1>

        <BleedPlate spec={PLATES.hero} />
      </div>

      {/* ── 01 · everything, on one screen ──
          The index direction's whole argument: a customer deciding what to
          have should not have to scroll to see what is on offer. It replaces
          a two-category teaser that showed nine of sixteen lines and made the
          rest a click away. */}
      <section className="pt-[clamp(4rem,11vh,8rem)]">
        <Shelf tag="The shop" note="01">
          <SectionHead
            title="Café."
            aside={
              <a {...linkTo("menu")} className={LABEL_INK}>
                Full menu →
              </a>
            }
          />

          {/* Same reasoning as BleedPlate: the grid and its margin go with the
              plates, rather than leaving a void where the pair would hang. */}
          {(PLATES.counter.src || PLATES.pour.src || import.meta.env.DEV) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(1rem,3vw,2.5rem)] mb-[clamp(3rem,8vh,5rem)]">
              <Plate spec={PLATES.counter} />
              {/* Offset, so the pair reads as two hung plates rather than a row. */}
              <Plate spec={PLATES.pour} className="sm:mt-[clamp(2rem,8vw,5rem)]" />
            </div>
          )}

          <Index sections={sections} objects={objects} linkTo={linkTo} />
        </Shelf>
      </section>

      {/* ── 02 · the objects ── */}
      <section className="pt-[clamp(4rem,11vh,8rem)]">
        <Shelf tag="The objects" note="02">
          <SectionHead
            title="Objects."
            aside={
              <a {...linkTo("objects")} className={LABEL_INK}>
                All objects →
              </a>
            }
          />

          {objects.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[clamp(1.5rem,3vw,2.5rem)]">
              {objects.map((o) => (
                <SpecCard key={o.id} object={o} onAdd={() => {}} />
              ))}
            </div>
          )}
        </Shelf>
      </section>

    </>
  );
}
