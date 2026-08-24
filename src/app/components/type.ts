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
 * ── Controls ──────────────────────────────────────────────────────────────
 *
 * The brief rules out generic SaaS buttons and rounded pills, and asks that
 * hierarchy come from typography, borders, spacing and contrast instead. So
 * every control on the site is one of two things: a bordered rectangle that
 * inverts, or a field that is a rule you type on.
 *
 * These replace the pill vocabulary the Figma export shipped with — a red
 * filled `rounded-full` button and `rounded-full` inputs. The red fill also
 * broke the palette's own rule that the heart red is an accent and never a
 * button surface.
 */

/** The primary control. Mono, tracked, square, inverts on hover. */
export const BUTTON =
  "font-mono text-[11px] tracking-[0.2em] uppercase px-[var(--s-3)] py-[13px] " +
  "text-[color:var(--ink)] border border-[color:var(--ink)] " +
  "hover:bg-[color:var(--ink)] hover:text-[color:var(--bg)] transition-colors " +
  "disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[color:var(--ink)] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[color:var(--brand)]";

/*
 * A field is a bottom rule, not a box. Four boxed inputs stacked make a form
 * look like a settings panel; four rules make it look like something printed
 * to be filled in, which is the register the rest of the site is in.
 */
export const FIELD =
  "w-full bg-transparent border-0 border-b border-[color:var(--line)] " +
  "px-0 py-[10px] font-serif text-[length:var(--fs-item)] text-[color:var(--ink)] " +
  "placeholder:text-[color:var(--ink-muted)] outline-none " +
  "focus:border-[color:var(--ink)] transition-colors";

/** The label above a field. Always present — never a placeholder standing in. */
export const FIELD_LABEL =
  "font-mono text-[11px] tracking-[0.2em] uppercase text-[color:var(--ink-muted)] leading-[1.4] " +
  "block mb-[2px]";
