import type { MenuItem, MenuCategoryKey, Page, MenuCategory } from "@/app/types";
import type { ShopObject } from "@/lib/api/objects";
import { Shelf } from "@/app/components/Shelf";
import { Plate, BleedPlate } from "@/app/components/Plate";
import { SectionHead } from "@/app/components/SectionHead";
import { MenuList } from "@/app/components/menu/MenuList";
import { Strip } from "@/app/components/home/Strip";
import { ObjectCard } from "@/app/components/objects/ObjectCard";
import { PLATES } from "@/app/content/plates";
import { LABEL, LABEL_INK, DISPLAY } from "@/app/components/type";
import { ORDERING_OPEN } from "@/lib/constants";

/*
 * The home page from the design direction: a type hero, then three numbered
 * sections each hanging off a shelf rule — the café, the objects, the name.
 *
 * What this replaced: a single full-viewport heart with one link under it. The
 * heart artwork is not gone, it moves to where the direction puts it — the
 * footer and the order confirmation — rather than being the entire page.
 *
 * TWO PLACES THE PROTOTYPE'S COPY IS NOT USED, both because it would say
 * something untrue today:
 *
 *  - The eyebrow reads "Order ahead · Collect at the counter". Ordering is
 *    locked, so that is a promise the site cannot keep. It says so honestly
 *    instead.
 *  - "Est. 2026" was omitted at first: the prototype's own notes flag it as
 *    unverified, and an invented founding year on a real business is a false
 *    claim rather than a placeholder. It is back, on evidence — the year is
 *    printed on the matcha pouch and on the iced cup, alongside "Hidd,
 *    Kingdom of Bahrain". Packaging the owner had made is better proof than a
 *    verbal confirmation.
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
  /* The home page shows a taste of the menu, not all of it — the first two
     categories that actually have something available. */
  const preview = sections.filter(([, items]) => items.length > 0).slice(0, 2);

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
          className={`${DISPLAY} text-[clamp(2.9rem,10vw,8rem)] max-w-[14ch] mt-[clamp(1.5rem,5vh,3rem)] mb-0 text-[color:var(--ink)]`}
        >
          Made to be <em className="italic">set down.</em>
        </h1>

        <p className="font-mono text-[13px] leading-[1.6] max-w-[40ch] mt-[1.75rem] mb-[clamp(2.5rem,7vh,4.5rem)] text-[color:var(--ink-muted)]">
          A café and a small house of objects. Coffee poured at the counter, candles and
          matches wrapped at the shelf.
        </p>

        <BleedPlate spec={PLATES.hero} />
      </div>

      {/* ── 01 · the café ── */}
      <section className="pt-[clamp(4rem,11vh,8rem)]">
        <Shelf tag="The café" note="01">
          <SectionHead
            title={
              <>
                Poured to order,
                <br />
                never to impress.
              </>
            }
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

          <MenuList sections={preview} />
        </Shelf>
      </section>

      {/* ── 02 · the objects ── */}
      <section className="pt-[clamp(4rem,11vh,8rem)]">
        <Shelf tag="The objects" note="02">
          <SectionHead
            title={
              <>
                Things worth
                <br />
                keeping after.
              </>
            }
            aside={
              <a {...linkTo("objects")} className={LABEL_INK}>
                All objects →
              </a>
            }
          />

          {objects.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[clamp(1.5rem,3vw,2.5rem)]">
              {objects.slice(0, 3).map((o) => (
                <ObjectCard key={o.id} object={o} onAdd={() => {}} canAdd={ORDERING_OPEN} />
              ))}
            </div>
          )}
        </Shelf>

        <Strip />
      </section>

      {/* ── 03 · the name ── */}
      <section className="pt-[clamp(4rem,11vh,8rem)]">
        <Shelf tag="The name" note="03">
          <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-[clamp(1.5rem,6vw,5rem)] pt-[3.5rem]">
            <div className="flex flex-col gap-[1.1rem]">
              <span className={LABEL}>Hidd, Kingdom of Bahrain</span>
              <span className={LABEL}>Est. 2026</span>
            </div>
            <div className="font-serif text-[17px] leading-[1.55] text-[color:var(--ink)]">
              <p className="m-0 mb-[1.35rem] max-w-[60ch] [&::first-letter]:text-[3.4em] [&::first-letter]:float-left [&::first-letter]:leading-[0.78] [&::first-letter]:pr-[0.12em] [&::first-letter]:pt-[0.06em]">
                A mantel is the shelf above a fire. It is where a house puts the few things it
                means to look at every day — a photograph, a clock, a candle burned halfway
                down.
              </p>
              <p className="m-0 mb-[1.35rem] max-w-[60ch]">
                We named the shop after it because that is the whole ambition: make a handful
                of things good enough to earn a place on the shelf, and leave the rest out.
              </p>
              <a {...linkTo("story")} className={`${LABEL_INK} inline-block mt-[0.5rem]`}>
                Read the story →
              </a>
            </div>
          </div>

          <BleedPlate spec={PLATES.room} className="mt-[clamp(3rem,8vh,5rem)]" />
        </Shelf>
      </section>
    </>
  );
}
