import type { Page, MenuCategory } from "@/app/types";
import { Shelf } from "@/app/components/Shelf";
import { BleedPlate } from "@/app/components/Plate";
import { PLATES } from "@/app/content/plates";
import { LABEL, LABEL_INK } from "@/app/components/type";

/*
 * The story, in the design direction's editorial layout: a column of quiet
 * labels beside a measure of serif prose with a drop cap.
 *
 * THE COPY IS THE OWNER'S, and that matters.
 *
 * This page previously carried one factual line and nothing else, because the
 * prototype's founding story was flagged in its own notes as "a plausible
 * draft, not from the founders" — and publishing an invented origin story
 * about real people is worse than an empty page.
 *
 * The text below is not that draft. It is the manifesto printed on Mantel's
 * own matchboxes, transcribed from the packaging. It is the founders' writing,
 * which is exactly what was missing.
 *
 * Set as three paragraphs rather than the box's single block: the matchbox
 * justifies one dense column of mono because it is 5cm wide and you read it
 * holding the thing. At web measure the same block is a wall.
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
            <span className={LABEL}>Printed on the matchbox</span>
            <a href="mailto:hello@bymantel.com" className={LABEL_INK}>
              hello@bymantel.com
            </a>
          </div>

          <div className="font-serif text-[17px] leading-[1.55] text-[color:var(--ink)]">
            <h1 className="sr-only">Our story</h1>

            <p className="m-0 mb-[1.35rem] max-w-[60ch] [&::first-letter]:text-[3.4em] [&::first-letter]:float-left [&::first-letter]:leading-[0.78] [&::first-letter]:pr-[0.12em] [&::first-letter]:pt-[0.06em]">
              Every “Mantel” starts the same. What makes a “Mantel” different is never its
              shape alone, but everything that gathers around it. A “Mantel” is shaped by
              routine, by people, by time, and by the small details left behind.
            </p>

            <p className="m-0 mb-[1.35rem] max-w-[60ch]">
              It changes quietly, little by little, not because it moves, but because life
              around it never stands still. Some will see a “Mantel” as something familiar.
              Others will see the memories, the objects, or the moments it holds. Neither is
              wrong.
            </p>

            <p className="m-0 mb-[1.35rem] max-w-[60ch]">
              A “Mantel” never asks to be seen in only one way. It simply continues to collect
              what life leaves behind. The rest is waiting to catch fire.
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
