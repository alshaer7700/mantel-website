import type { MenuItem, MenuCategoryKey, Page, MenuCategory } from "@/app/types";
import type { ShopObject } from "@/lib/api/objects";
import { Plate, BleedPlate } from "@/app/components/Plate";
import { FigureArt } from "@/app/components/FigureArt";
import { MenuRow } from "@/app/components/menu/MenuList";
import { ObjectArt } from "@/app/components/objects/ObjectArt";
import { PLATES } from "@/app/content/plates";
import { formatPrice } from "@/lib/format";
import { LABEL, LABEL_INK, DISPLAY, WORD, WORDMARK, MICRO, BUTTON } from "@/app/components/type";

/*
 * The home page, on the culture-first brief: seven sections, read in the
 * order a magazine is read — identity, then the collection, then the people,
 * then the story, then the journal, then the sign-up, then the foot.
 *
 * WHAT MOVED, AND WHY. The previous build opened with a contents page: two
 * words and two links. The brief asks for the opposite — that a visitor
 * should feel they entered a coffee journal and only afterwards realise they
 * can order. So ordering is present on every screen but never the loudest
 * thing on it, and the sections that carry culture (people, notes) come
 * before the section that carries stock.
 *
 * TYPE IS THE PRIMARY VISUAL. Each section is announced by one oversized
 * word. That is the brief's instruction and it is also what makes the page
 * survive having no photography yet: at this size the word IS the image.
 *
 * ILLUSTRATION IS NOT DECORATION. The drawn figures carry the two sections
 * that have nothing else in them yet — People, and the Notes journal. The
 * brief asks for illustrations "inside empty spaces", and an empty space with
 * a drawing in it is a page; an empty space with a grey box in it is a
 * building site.
 *
 * ONE THING THE BRIEF LISTS THAT IS NOT HERE: lighters. The collection is
 * named as "coffee, food, candles, matches, lighters" and there is no lighter
 * in the shop — it was an invented product in the original prototype and was
 * cut once already for being advertised on a real page. There is a drawing
 * for one, waiting. The moment a row exists in `objects`, it appears.
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
  const byKey = new Map(sections.map(([k, items]) => [k, items] as const));
  const coffee = byKey.get("coffee") ?? [];
  const food = [...(byKey.get("sandwiches") ?? []), ...(byKey.get("desserts") ?? [])];

  return (
    <>
      {/* ══ 1 · HERO ══════════════════════════════════════════════════════
          Built on the one reference in the set that is itself a website: the
          name set edge to edge and enormous, a row of small hard facts under
          it, the photograph carrying the rest. The name is the largest thing
          on the site by an order of magnitude — that is the whole device, and
          shrinking it to be polite would lose it. */}
      <section className="min-h-[86vh] flex flex-col pt-[clamp(1.5rem,5vh,3rem)]">
        <h1 className={`${WORDMARK} text-[color:var(--ink)]`}>Mantel.</h1>

        {/* Five facts, evenly spread, in the reference's small bold caps. Real
            ones — nothing here is filler and nothing promises what the shop
            cannot yet do. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-[var(--s-3)] gap-y-[var(--s-2)] border-t border-[color:var(--line)] pt-[var(--s-2)] mt-[var(--s-2)]">
          <span className={MICRO}>Coffee, food<br />and objects</span>
          <span className={MICRO}>Al Hidd<br />Muharraq</span>
          <span className={MICRO}>Open daily<br />from 07:00</span>
          <span className={MICRO}>Made in<br />small runs</span>
          <span className={MICRO}>Est.<br />2026</span>
        </div>

        <div className="mt-auto pt-[clamp(2rem,6vh,3.5rem)]">
          <BleedPlate spec={PLATES.hero} />
        </div>

        {/* Statement left, action right — the reference's foot. */}
        <div className="flex justify-between items-end gap-[var(--s-3)] flex-wrap pt-[var(--s-3)]">
          <p className="font-serif text-[clamp(1.1rem,2.4vw,1.6rem)] leading-[1.2] max-w-[22ch] m-0 text-[color:var(--ink)]">
            A café and a small house of objects.
          </p>
          <a {...linkTo("menu")} className={`${BUTTON} w-fit`}>
            Order before you reach
          </a>
        </div>
      </section>

      {/* ══ 2 · THE MANTEL COLLECTION ═════════════════════════════════════ */}
      <section className="pt-[clamp(4rem,12vh,9rem)]">
        <SectionWord word="Coffee" note="01 — The Mantel Collection" />

        <p className="font-mono text-[13px] leading-[1.7] max-w-[46ch] mt-[var(--s-3)] mb-[var(--s-4)] text-[color:var(--ink-muted)]">
          One collection, not five departments. What is poured, what is eaten and
          what is wrapped at the shelf are made and chosen the same way.
        </p>

        {coffee.length > 0 && (
          <div className="max-w-[62ch]">
            {coffee.slice(0, 5).map((item) => (
              <MenuRow key={item.id} item={item} />
            ))}
          </div>
        )}

        <div className="mt-[clamp(3rem,9vh,6rem)]">
          <SectionWord word="Food" />
          {food.length > 0 && (
            <div className="max-w-[62ch] mt-[var(--s-3)]">
              {food.slice(0, 4).map((item) => (
                <MenuRow key={item.id} item={item} />
              ))}
            </div>
          )}
          <a {...linkTo("menu")} className={`${LABEL_INK} inline-block mt-[var(--s-3)]`}>
            The whole menu →
          </a>
        </div>

        <div className="mt-[clamp(3rem,9vh,6rem)]">
          <SectionWord word="Objects" />
          {objects.length > 0 ? (
            /* Editorial, not a product grid: the drawing large, the name and
               the one spec line under it, and nothing boxed. */
            <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-[clamp(1.5rem,4vw,3.5rem)] mt-[var(--s-4)]">
              {objects.map((o) => (
                <a key={o.id} {...linkTo("shop")} className="group block">
                  <div className="grid place-items-center h-[clamp(150px,20vw,210px)] transition-transform duration-500 ease-[cubic-bezier(.16,.84,.44,1)] group-hover:scale-[1.04]">
                    <ObjectArt artKey={o.art_key} />
                  </div>
                  <h3 className="font-serif text-[clamp(1.2rem,2.4vw,1.6rem)] leading-[1.1] m-0 mt-[var(--s-2)] text-[color:var(--ink)]">
                    {o.name}
                  </h3>
                  <p className="font-mono text-[11px] leading-[1.6] m-0 mt-[2px] text-[color:var(--ink-muted)]">
                    {o.spec}
                    {o.price > 0 && ` · ${formatPrice(o.price)} BD`}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <p className="font-serif text-[length:var(--fs-item)] mt-[var(--s-3)] text-[color:var(--ink)]">
              The shelf is being set.
            </p>
          )}
          <a {...linkTo("shop")} className={`${LABEL_INK} inline-block mt-[var(--s-4)]`}>
            The collection →
          </a>
        </div>
      </section>

      {/* ══ 3 · PEOPLE AT MANTEL ══════════════════════════════════════════
          The loud band. Brown ground, paper type, drawn people — a visual
          diary until there are photographs to put in it. */}
      <section className="mt-[clamp(4rem,12vh,9rem)] -mx-[var(--pad)] px-[var(--pad)] py-[clamp(3.5rem,10vh,7rem)] bg-[color:var(--brown)]">
        <SectionWord word="People" note="02 — At Mantel" tone="paper" />

        <p className="font-mono text-[13px] leading-[1.7] max-w-[44ch] mt-[var(--s-3)] text-[color:var(--paper)] opacity-70">
          The counter, the tables, the people who keep both going. Drawn until the
          photographs exist — then drawn over them.
        </p>

        {/* Four tracks, not three. The pair is a landscape drawing and the
            other two are portrait — given equal columns the pair rendered at a
            third the height of its neighbours and the row read as a mistake.
            It takes two tracks; they take one each, and everything sits on the
            same floor line. */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-[clamp(1.5rem,4vw,3rem)] items-end mt-[clamp(2rem,6vh,3.5rem)]">
          <FigureArt art="sitting" tone="paper" inline />
          <FigureArt art="pair" tone="paper" inline className="col-span-2 order-last sm:order-none" />
          <FigureArt art="walking" tone="paper" inline />
        </div>
      </section>

      {/* ══ 4 · ABOUT MANTEL ══════════════════════════════════════════════ */}
      <section className="pt-[clamp(4rem,12vh,9rem)]">
        <SectionWord word="About" note="03 — Mantel" />
        <p
          className={`${DISPLAY} text-[clamp(1.5rem,4vw,2.6rem)] max-w-[26ch] mt-[var(--s-4)] text-[color:var(--ink)]`}
        >
          A mantel is the shelf above a fire. We make things worth putting there.
        </p>
        <a {...linkTo("story")} className={`${LABEL_INK} inline-block mt-[var(--s-3)]`}>
          Our story →
        </a>

        {(PLATES.room.src || import.meta.env.DEV) && (
          <BleedPlate spec={PLATES.room} className="mt-[clamp(2.5rem,8vh,5rem)]" />
        )}
      </section>

      {/* ══ 5 · NOTES FROM MANTEL ═════════════════════════════════════════ */}
      <section className="pt-[clamp(4rem,12vh,9rem)]">
        <SectionWord word="Notes" note="04 — From Mantel" />

        {/* No entries exist. Rather than invent a journal on a real business's
            site, the section says what it is for and shows the hand it will be
            written in. */}
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-[clamp(1.5rem,5vw,4rem)] items-end mt-[var(--s-4)]">
          <div>
            <p className="font-serif text-[clamp(1.15rem,2.6vw,1.6rem)] leading-[1.35] max-w-[34ch] m-0 text-[color:var(--ink)]">
              Coffee, design, objects, process — written here when there is something
              worth writing down.
            </p>
            <p className="font-mono text-[13px] leading-[1.7] max-w-[44ch] mt-[var(--s-3)] text-[color:var(--ink-muted)]">
              The first note is not written yet. It will not be filler.
            </p>
          </div>
          <FigureArt art="sitting" tone="ink" inline className="max-w-[240px] justify-self-end opacity-90" />
        </div>
      </section>

      {/* ══ 6 · VISIT — the practical foot of the page, before the sign-up ══ */}
      <section className="pt-[clamp(4rem,12vh,9rem)]">
        <SectionWord word="Visit" note="05 — Al Hidd" />
        <div className="flex flex-wrap gap-x-[clamp(2rem,6vw,5rem)] gap-y-[var(--s-2)] mt-[var(--s-4)]">
          <span className={LABEL}>Sat–Wed 07:00–23:00</span>
          <span className={LABEL}>Thu–Fri 07:00–01:00</span>
          <a {...linkTo("visit")} className={LABEL_INK}>
            Find us →
          </a>
        </div>

        {(PLATES.facade.src || PLATES.counter.src || import.meta.env.DEV) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(1rem,3vw,2.5rem)] mt-[clamp(2rem,6vh,3.5rem)]">
            <Plate spec={PLATES.facade} />
            <Plate spec={PLATES.counter} className="sm:mt-[clamp(2rem,8vw,5rem)]" />
          </div>
        )}
      </section>
    </>
  );
}

/*
 * The section announcement: one oversized word, with a small line above it
 * carrying the number and the full name. The number is real — these sections
 * are read in order — and the small line is what lets the big word stay one
 * word.
 */
function SectionWord({
  word,
  note,
  tone = "ink",
}: {
  word: string;
  note?: string;
  tone?: "ink" | "paper";
}) {
  const ink = tone === "ink";
  return (
    <div>
      {note && (
        <span
          className={`${LABEL} block mb-[var(--s-2)] ${ink ? "" : "text-[color:var(--paper)] opacity-60"}`}
        >
          {note}
        </span>
      )}
      <h2 className={`${WORD} ${ink ? "text-[color:var(--ink)]" : "text-[color:var(--paper)]"}`}>
        {word}
      </h2>
    </div>
  );
}
