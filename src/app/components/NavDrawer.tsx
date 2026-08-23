import { useEffect } from "react";
import { User } from "lucide-react";
import type { Page, MenuCategory } from "@/app/types";

/*
 * The mobile navigation, laid out on the reference panel.
 *
 * Measured off the reference at 393pt and mapped onto Mantel's own tokens
 * rather than eyeballed, because the proportions are the whole design:
 *
 *   HEADER — "Close" at the left in the UI face, sentence case, not a tracked
 *   uppercase label. Centre is the wordmark over its locality line, which is
 *   the same pairing the reference uses ("Maison Margiela" over "PARIS") and
 *   the same one the site header already sets. One icon at the right.
 *
 *   SEARCH — a full-width bordered field sitting directly under the header
 *   rule, ~48px tall, its label centred, sentence case, at reading size. The
 *   reference has no search icon in the header precisely because this field
 *   is the search control; carrying both would be two doors to one room.
 *
 *   PRIMARY LINKS — top-aligned under the search field, centred, with a short
 *   rule between items. Reference rhythm is ~68px centre to centre and a
 *   ~51px rule; this sets 56px and s-3, the nearest values on Mantel's scale.
 *
 *   THE VOID IS INTENTIONAL. The reference does not centre its links in the
 *   space — the stack sits high, the secondary pair sits near the foot, and
 *   the gap between them is left empty. An earlier pass here centred the
 *   column to "balance" it, which is the one change that made the panel stop
 *   looking like the reference.
 *
 *   SIZE — the reference's links measure ~18px in a sans. EB Garamond has a
 *   smaller x-height at the same em, so 22px is where the serif matches that
 *   optically. Copying the number rather than the impression would set this
 *   two sizes too small.
 *
 * ONE THING FROM THE REFERENCE IS DELIBERATELY ABSENT: the pair of bordered
 * tabs under the search field. They switch between two fashion lines, and
 * Mantel is one shop. The honest mapping would be Menu | Objects — but that
 * demotes the two commercial destinations into small boxes and leaves Story
 * and Contact as the largest type on the panel, which inverts the hierarchy
 * the rest of the site works to establish. The band is worth less than that.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  onSearch: () => void;
  onAccount: () => void;
  linkTo: (p: Page, c?: MenuCategory) => {
    href: string;
    onClick: (e: React.MouseEvent) => void;
  };
  navHeight: string;
};

const PRIMARY: ReadonlyArray<[Page, string]> = [
  ["menu", "Menu"],
  ["objects", "Objects"],
  ["story", "Our Story"],
  ["visit", "Visit"],
  ["contact", "Contact"],
];

/* The reference foots the panel with two plain text links at ~0.82 of the
   primary size — Client Care and Account. FAQ is this shop's client care; the
   account sits behind the icon above, so the second slot goes to the one
   destination the panel would otherwise drop. */
const UI = "font-mono text-[14px] text-[color:var(--ink)]";

export function NavDrawer({ open, onClose, onSearch, onAccount, linkTo, navHeight }: Props) {
  /* The panel covers the viewport, so the page under it must stop scrolling —
     otherwise a swipe that misses the link column scrolls a page nobody can
     see, and closing the drawer lands somewhere else than it left. */
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div
      /* `invisible` when closed, not just transparent: an opacity-0 panel keeps
         its links in the tab order, so a keyboard would walk through a nav that
         isn't there. Visibility is in the transition list, which defers the
         hide to the end of the fade rather than cutting it. */
      className={`fixed inset-0 z-50 bg-[color:var(--bg)] flex flex-col transition-[opacity,visibility] duration-300 ease-[cubic-bezier(.16,.84,.44,1)] lg:hidden ${
        open ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none"
      }`}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
    >
      <div
        className="grid grid-cols-[1fr_auto_1fr] items-center px-[var(--s-2)] border-b border-[color:var(--line-soft)] shrink-0"
        style={{ height: navHeight }}
      >
        <button
          onClick={onClose}
          className={`${UI} justify-self-start hover:opacity-60 transition-opacity`}
        >
          Close
        </button>

        {/* The wordmark over its locality line — the header's own lockup, so
            the identity does not change shape when the panel opens. */}
        <span className="text-center leading-[1.15]">
          <span className="block font-serif font-medium text-[length:var(--fs-logo)] tracking-[var(--ls-logo)] text-[color:var(--ink)]">
            Mantel.
          </span>
          <span className="block font-mono text-[7px] tracking-[0.2em] uppercase text-[color:var(--ink-muted)]">
            Bahrain
          </span>
        </span>

        <button
          onClick={onAccount}
          className="justify-self-end text-[color:var(--ink)] hover:opacity-60 transition-opacity p-1"
          aria-label="Account"
        >
          <User size={18} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-[var(--s-2)] pt-[var(--s-1)] pb-[var(--s-3)] flex flex-col">
        <button
          onClick={onSearch}
          className={`${UI} w-full border border-[color:var(--line)] h-[48px] shrink-0 hover:border-[color:var(--ink)] transition-colors`}
        >
          Search
        </button>

        <nav className="mt-[var(--s-4)] flex flex-col items-center" aria-label="Primary mobile">
          {PRIMARY.map(([page, label], i) => (
            <div key={page} className="w-full flex flex-col items-center">
              {/* Between the items, not under each — a divider rather than an
                  underline, and narrow so the column reads as one stack. */}
              {i > 0 && <span className="w-[56px] h-px bg-[color:var(--line)] my-[var(--s-3)]" />}
              <a
                {...linkTo(page)}
                className="font-serif text-[22px] leading-[1.2] text-[color:var(--ink)] hover:opacity-60 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand)]"
              >
                {label}
              </a>
            </div>
          ))}
        </nav>

        {/* mt-auto, not justify-center: the empty middle is the reference's. */}
        <div className="mt-auto pt-[var(--s-5)] flex flex-col items-center gap-[var(--s-2)] shrink-0">
          <a
            {...linkTo("faq")}
            className="font-serif text-[18px] leading-[1.2] text-[color:var(--ink)] hover:opacity-60 transition-opacity"
          >
            FAQ
          </a>
          <a
            href="https://www.instagram.com/bymantel/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-serif text-[18px] leading-[1.2] text-[color:var(--ink)] hover:opacity-60 transition-opacity"
          >
            Instagram
          </a>
        </div>
      </div>
    </div>
  );
}
