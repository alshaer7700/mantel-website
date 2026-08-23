import type { Page, MenuCategory } from "@/app/types";
import { Shelf } from "@/app/components/Shelf";
import { Plate, BleedPlate } from "@/app/components/Plate";
import { SectionHead } from "@/app/components/SectionHead";
import { PLATES } from "@/app/content/plates";
import { LABEL, LABEL_INK, DISPLAY } from "@/app/components/type";

/*
 * The home page is now a contents page: an eyebrow, a headline, and two
 * numbered sections that are each a word and a way in.
 *
 * WHAT IT USED TO CARRY, and no longer does:
 *
 *  - A sub-paragraph under the headline, saying in a quieter voice what the
 *    headline and eyebrow already said.
 *  - Two-line section slogans — "Poured to order, never to impress." and
 *    "Things worth keeping after."
 *  - Section 03, "The name", which was the Story page restated with a link to
 *    the Story page underneath it.
 *  - The index: the whole inventory, numbered, printed under section 01. It
 *    was the right answer to a different brief — put everything on one screen
 *    — and this brief is the opposite one. Recoverable from 5502411 if the
 *    argument turns back around.
 *  - The object cards under section 02, for the same reason. Both sections now
 *    say what they are and where they go, and the pages themselves hold the
 *    goods.
 *
 * The shelf rules carry only their number. The word that used to hang on the
 * left of each — "The shop", "The objects" — labelled a section whose heading
 * is one word directly beneath it.
 *
 * ONE THING TO KNOW ABOUT THE EYEBROW: it reads "Order ahead", flat. Ordering
 * is locked in the database (EXECUTE on place_order is revoked), so today the
 * site invites something it cannot yet accept. That is the owner's call, made
 * explicitly; the conditional that used to soften it to "Ordering opens soon"
 * is gone.
 */

type Props = {
  linkTo: (p: Page, c?: MenuCategory) => {
    href: string;
    onClick: (e: React.MouseEvent) => void;
  };
};

export function Home({ linkTo }: Props) {
  return (
    <>
      {/* ── hero ── */}
      <div className="pt-[clamp(3rem,9vh,6rem)]">
        <div className="flex justify-between gap-[var(--s-2)] flex-wrap">
          <span className={LABEL}>Al Hidd, Bahrain</span>
          <span className={LABEL}>Order ahead</span>
        </div>

        <h1
          className={`${DISPLAY} text-[clamp(2.9rem,10vw,8rem)] max-w-[14ch] mt-[clamp(1.5rem,5vh,3rem)] mb-[clamp(2.5rem,7vh,4.5rem)] text-[color:var(--ink)]`}
        >
          Made to be <em className="italic">set down.</em>
        </h1>

        <BleedPlate spec={PLATES.hero} />
      </div>

      {/* ── 01 ── */}
      <section className="pt-[clamp(4rem,11vh,8rem)]">
        <Shelf tag="01">
          <SectionHead
            title="Café."
            aside={
              <a {...linkTo("menu")} className={LABEL_INK}>
                Menu →
              </a>
            }
          />

          {/* The grid goes with the plates rather than leaving a void where the
              pair would hang — see BleedPlate for the same reasoning. */}
          {(PLATES.counter.src || PLATES.pour.src || import.meta.env.DEV) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[clamp(1rem,3vw,2.5rem)]">
              <Plate spec={PLATES.counter} />
              {/* Offset, so the pair reads as two hung plates rather than a row. */}
              <Plate spec={PLATES.pour} className="sm:mt-[clamp(2rem,8vw,5rem)]" />
            </div>
          )}
        </Shelf>
      </section>

      {/* ── 02 ── */}
      <section className="pt-[clamp(4rem,11vh,8rem)]">
        <Shelf tag="02">
          <SectionHead
            title="Objects."
            aside={
              <a {...linkTo("objects")} className={LABEL_INK}>
                All objects →
              </a>
            }
          />
        </Shelf>
      </section>
    </>
  );
}
