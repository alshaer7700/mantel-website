import { DISPLAY } from "@/app/components/type";

/*
 * One line, and nothing else on the page.
 *
 * It has been four things. First a single factual sentence, because the
 * prototype's founding story was flagged in its own notes as "a plausible
 * draft, not from the founders", and an invented origin story about real
 * people is worse than an empty page. Then the manifesto transcribed off
 * Mantel's matchboxes, set as three paragraphs. Then two sentences beside a
 * column of labels. Now two sentences and the page they are on.
 *
 * Gone with the rest: the label column (locality, Est. 2026, the address),
 * the shelf rule and its number, the photograph, and the link out to the menu.
 * All of them are reachable from the header and the footer, which is where a
 * reader who wants them is already looking.
 *
 * Set at display size rather than body size. Two sentences in 17px serif on an
 * otherwise empty page read as a caption for a missing image; at this size
 * they read as the thing the page is for.
 */

export function Story() {
  return (
    <div className="min-h-[60vh] flex items-center pt-[clamp(3rem,9vh,6rem)] pb-[clamp(3rem,9vh,6rem)]">
      <h1
        className={`${DISPLAY} text-[clamp(1.9rem,5vw,3.4rem)] max-w-[22ch] m-0 text-[color:var(--ink)]`}
      >
        A mantel is the shelf above a fire.
        <br />
        We make things worth putting there.
      </h1>
    </div>
  );
}
