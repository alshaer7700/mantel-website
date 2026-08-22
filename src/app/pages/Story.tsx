import type { Page, MenuCategory } from "@/app/types";
import { Shelf } from "@/app/components/Shelf";
import { BleedPlate } from "@/app/components/Plate";
import { PLATES } from "@/app/content/plates";
import { LABEL, LABEL_INK } from "@/app/components/type";

/*
 * The story, in the design direction's editorial layout: a column of quiet
 * labels beside a measure of serif prose with a drop cap.
 *
 * THE LAYOUT IS THE PROTOTYPE'S. THE COPY IS NOT, deliberately.
 *
 * The prototype fills this page with a founding story — an argument about what
 * a café is for, why the menu is short, how the objects came second. Its own
 * notes flag that copy as "written as a plausible draft, not from the
 * founders", and the page this replaces carried an explicit comment making the
 * same choice: "the account of how Mantel started is the owner's to write —
 * this stays deliberately short rather than inventing a history."
 *
 * Publishing an invented origin story for a real business is not placeholder
 * content, it is a fabricated claim about people. So the one factual line
 * stays, and the draft waits for the owner to approve or rewrite it. Dropping
 * it in afterwards is a paragraph of work.
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
            <span className={LABEL}>Al Hidd, Muharraq</span>
            <span className={LABEL}>One counter, one shelf</span>
            <a href="mailto:hello@bymantel.com" className={LABEL_INK}>
              hello@bymantel.com
            </a>
          </div>

          <div className="font-serif text-[17px] leading-[1.55] text-[color:var(--ink)]">
            <h1 className="sr-only">Our story</h1>
            <p className="m-0 mb-[1.35rem] max-w-[60ch] [&::first-letter]:text-[3.4em] [&::first-letter]:float-left [&::first-letter]:leading-[0.78] [&::first-letter]:pr-[0.12em] [&::first-letter]:pt-[0.06em]">
              Mantel is a specialty coffee shop in Al Hidd, Bahrain.
            </p>
            <p className="m-0 mb-[1.35rem] max-w-[60ch] text-[color:var(--ink-muted)]">
              A café and a small house of objects — coffee poured at the counter, candles and
              matches wrapped at the shelf.
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
