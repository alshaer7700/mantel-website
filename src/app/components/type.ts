/*
 * The three type treatments the design direction repeats often enough that
 * restating them at each call site is how they drift apart.
 *
 * Everything else stays inline: a class string used twice is not a component,
 * and hiding one-off sizes behind names makes the layout harder to read, not
 * easier.
 */

/** Mono, uppercase, tracked out. Every section tag, caption and micro-label. */
export const LABEL =
  "font-mono text-[11px] tracking-[0.2em] uppercase text-[color:var(--ink-muted)] leading-[1.4]";

/** The same label, at full ink — for anything clickable. */
export const LABEL_INK =
  "font-mono text-[11px] tracking-[0.2em] uppercase text-[color:var(--ink)] leading-[1.4] " +
  "hover:opacity-60 transition-opacity focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand)]";

/** Display serif: tight leading, negative tracking. Headings only. */
export const DISPLAY = "font-serif font-normal tracking-[-0.018em] leading-[0.94]";

/*
 * A system sans stack for the permanent-collection Menu redesign's category
 * headings and item rows — the mockup uses a grotesk distinct from this
 * site's two shipped families (EB Garamond, Fira Mono; see
 * guidelines/FONTS.md). No new webfont is wired in yet, so this is a
 * placeholder: swap it for a real self-hosted face, following that guide,
 * once one is chosen.
 */
export const GROTESK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
