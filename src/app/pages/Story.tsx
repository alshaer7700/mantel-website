import type { Page, MenuCategory } from "@/app/types";
import { Shelf } from "@/app/components/Shelf";
import { BleedPlate } from "@/app/components/Plate";
import { PLATES } from "@/app/content/plates";
import { LABEL, LABEL_INK } from "@/app/components/type";

/*
 * The story: two sentences beside a column of quiet labels.
 *
 * It has been three things. First one factual line and nothing else, because
 * the prototype's founding story was flagged in its own notes as "a plausible
 * draft, not from the founders" — and an invented origin story about real
 * people is worse than an empty page. Then the manifesto transcribed off
 * Mantel's own matchboxes, set as three paragraphs.
 *
 * Now two sentences. The matchbox text is real and it is theirs, but the
 * matchbox is 5cm wide and you read it holding the thing; at web measure the
 * same block is a wall, and the page it opens is the one place a reader has
 * already decided to be patient — which is exactly why it should not spend
 * that patience. The manifesto is not lost: it is still printed on the box.
 */

type Props = {
  linkTo: (p: Page, c?: MenuCategory) => {
    href: string;
    onClick: (e: React.MouseEvent) => void;
  };
};

export function Story({ linkTo }: Props) {
  return (
    <div className="pt-[clamp(3rem,9vh,6rem)]">
      <Shelf tag="Story" note="04">
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-[clamp(1.5rem,6vw,5rem)] pt-[3.5rem]">
          <div className="flex flex-col gap-[1.1rem]">
            <span className={LABEL}>Hidd, Kingdom of Bahrain</span>
            <span className={LABEL}>Est. 2026</span>
            <a href="mailto:hello@bymantel.com" className={LABEL_INK}>
              hello@bymantel.com
            </a>
          </div>

          <div className="font-serif text-[17px] leading-[1.55] text-[color:var(--ink)]">
            <h1 className="sr-only">Our story</h1>

            <p className="m-0 mb-[1.35rem] max-w-[60ch] [&::first-letter]:text-[3.4em] [&::first-letter]:float-left [&::first-letter]:leading-[0.78] [&::first-letter]:pr-[0.12em] [&::first-letter]:pt-[0.06em]">
              A mantel is the shelf above a fire — where a house keeps the few things it
              means to look at every day.
            </p>

            <p className="m-0 mb-[1.35rem] max-w-[60ch]">
              We named the shop after it: make a handful of things good enough to earn that
              place, and leave the rest out.
            </p>

            <a {...linkTo("menu")} className={`${LABEL_INK} inline-block mt-[0.5rem]`}>
              View the menu →
            </a>
          </div>
        </div>

        <BleedPlate spec={PLATES.hands} className="mt-[clamp(3rem,8vh,5rem)]" />
      </Shelf>
    </div>
  );
}
