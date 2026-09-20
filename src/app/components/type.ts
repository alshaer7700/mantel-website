/*
 * The three type treatments the design direction repeats often enough that
 * restating them at each call site is how they drift apart.
 *
 * Everything else stays inline: a class string used twice is not a component,
 * and hiding one-off sizes behind names makes the layout harder to read, not
 * easier.
 *
 * All three are Space Grotesk or EB Garamond now. There used to be a fourth
 * export here, GROTESK — a system-font stack standing in for "a grotesk",
 * because the site shipped no such face. It ships one (see fonts.css), so the
 * placeholder is gone and its call sites use the `font-grotesk` utility.
 */

/** Grotesk, uppercase, tracked out. Every section tag, caption and micro-label. */
export const LABEL =
  "font-grotesk font-medium text-[10px] tracking-[0.14em] uppercase text-[color:var(--ink-muted)] leading-[1.4]";

/** The same label, at full ink — for anything clickable. */
export const LABEL_INK =
  "font-grotesk font-medium text-[10px] tracking-[0.14em] uppercase text-[color:var(--ink)] leading-[1.4] " +
  "hover:opacity-60 transition-opacity focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand)]";

/** Display: tight leading, negative tracking. Headings only. */
export const DISPLAY = "font-grotesk font-bold tracking-[-0.03em] leading-[0.94] uppercase";
