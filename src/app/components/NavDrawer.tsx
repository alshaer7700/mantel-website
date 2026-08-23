import { useEffect } from "react";
import { Instagram, Search } from "lucide-react";
import type { Page, MenuCategory } from "@/app/types";
import { LABEL } from "@/app/components/type";

/*
 * The mobile navigation, rebuilt on the reference's structure.
 *
 * What that structure actually is, and why each part earns its place:
 *
 *   FULL SCREEN, NOT A 185px TRAY. The drawer it replaces was a narrow panel
 *   sliding over a dimmed page, with the site still visible behind it. On a
 *   phone the nav IS the page for as long as it is open; a sliver of the old
 *   page behind a scrim is a smaller target and a divided attention.
 *
 *   SEARCH FIRST, FULL WIDTH. Someone who opens the nav knowing what they
 *   want should not have to close it again to find the search control, which
 *   lives in a header that is now behind the overlay.
 *
 *   CENTRED LINKS, SEPARATED BY SHORT RULES. The rule sits between the items
 *   rather than under each of them — a divider, not an underline — and it is
 *   deliberately narrow, so the column reads as one stack rather than a table.
 *
 *   PRIMARY AND SECONDARY, SPLIT BY SIZE. The four destinations someone came
 *   for are large; the rest are small and at the foot.
 *
 * ONE THING FROM THE REFERENCE IS DELIBERATELY ABSENT. It carries two bordered
 * tabs above the links to switch between two fashion lines. Mantel is one
 * shop, so a switcher would be a control with one destination. The locale pill
 * would fit that slot and is left out too, because it currently offers a
 * single locale — a chooser that cannot choose is worse than no chooser.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  onSearch: () => void;
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
  ["contact", "Contact"],
];

const SECONDARY: ReadonlyArray<[Page, string]> = [["faq", "FAQ"]];

export function NavDrawer({ open, onClose, onSearch, linkTo, navHeight }: Props) {
  /* The panel covers the viewport, so the page under it must stop scrolling —
     otherwise a swipe that misses the link column scrolls the page nobody can
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
      className={`fixed inset-0 z-50 bg-[color:var(--bg)] flex flex-col transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(.16,.84,.44,1)] lg:hidden ${
        open ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible pointer-events-none"
      }`}
      aria-hidden={!open}
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
    >
      {/* Close on the left, identity centred, in the same three-column grid the
          header uses — so the wordmark does not move when the drawer opens. */}
      <div
        className="grid grid-cols-[1fr_auto_1fr] items-center px-[var(--s-3)] border-b border-[color:var(--line-soft)] shrink-0"
        style={{ height: navHeight }}
      >
        <button
          onClick={onClose}
          /* LABEL's own colour is --ink-muted and a second colour utility in
             the same string wins or loses on stylesheet order, not on being
             written last. The close control is the one thing here that must
             read at full ink, so it states its type outright. */
          className="justify-self-start font-mono text-[11px] tracking-[0.2em] uppercase leading-[1.4] text-[color:var(--ink)] hover:opacity-60 transition-opacity"
          aria-label="Close navigation"
        >
          Close
        </button>
        <span className="font-serif font-medium text-[length:var(--fs-logo)] tracking-[var(--ls-logo)] text-[color:var(--ink)]">
          Mantel.
        </span>
        <button
          onClick={onSearch}
          className="justify-self-end text-[color:var(--ink)] hover:opacity-60 transition-opacity p-1"
          aria-label="Search"
        >
          <Search size={17} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-[var(--s-3)] py-[var(--s-3)] flex flex-col">
        {/* The search control, as a full-width field rather than an icon. */}
        <button
          onClick={onSearch}
          className="w-full border border-[color:var(--line)] py-[14px] font-mono text-[13px] tracking-[0.08em] uppercase text-[color:var(--ink)] hover:border-[color:var(--ink)] transition-colors"
        >
          Search
        </button>

        {/* flex-1 + centred: with four links the stack is shorter than the
            reference's, and pinning it under the search left a screen-third of
            nothing above the foot. Centring spends that space on both sides. */}
        <nav className="flex-1 flex flex-col items-center justify-center py-[var(--s-4)]" aria-label="Primary mobile">
          {PRIMARY.map(([page, label], i) => (
            <div key={page} className="w-full flex flex-col items-center">
              {/* Between the items, not under each — a divider rather than an
                  underline, and narrow so the column reads as one stack. */}
              {i > 0 && <span className="w-[80px] h-px bg-[color:var(--line)] my-[var(--s-3)]" />}
              <a
                {...linkTo(page)}
                className="font-serif text-[clamp(1.5rem,7vw,2rem)] leading-[1.1] text-[color:var(--ink)] hover:opacity-60 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand)]"
              >
                {label}
              </a>
            </div>
          ))}
        </nav>

        <div className="shrink-0 flex flex-col items-center gap-[var(--s-2)]">
          {SECONDARY.map(([page, label]) => (
            <a
              key={page}
              {...linkTo(page)}
              className="font-serif text-[1rem] text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition-colors"
            >
              {label}
            </a>
          ))}
          {/* Kept from the drawer this replaces. The reference foots its panel
              with social links too, and dropping a working destination is a
              loss the redesign has no reason to take. */}
          <a
            href="https://www.instagram.com/bymantel/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition-colors mt-[var(--s-1)]"
            aria-label="Mantel on Instagram"
          >
            <Instagram size={18} strokeWidth={1.5} />
          </a>
          <span className={`${LABEL} mt-[var(--s-2)]`}>Hidd, Kingdom of Bahrain</span>
        </div>
      </div>
    </div>
  );
}
