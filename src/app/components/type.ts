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

/**
 * The oversized section word — COFFEE, FOOD, OBJECTS, NOTES, PEOPLE.
 *
 * The brief asks for typography as a primary visual element and names these
 * words specifically, against "small generic section titles". It is set in
 * Archivo at 800, uppercase, at a size nothing else on the site reaches, with
 * the leading pulled well under 1 and the tracking pulled tight so the letters
 * touch — which is what the references do and what makes the word read as a
 * mark rather than a heading.
 *
 * It carries no colour of its own: a word on the paper takes ink, a word on
 * the brown band takes paper, and the call site says which.
 */
export const WORD =
  "font-grotesk font-[800] uppercase m-0 leading-[0.78] tracking-[-0.035em] " +
  "text-[clamp(2.75rem,14vw,11rem)]";

/**
 * The hero wordmark. The same face as WORD, sized to run the full measure.
 *
 * The closest reference in the set is an actual café website whose name is set
 * edge to edge across the top of a photograph, larger than any other element
 * on the page by a factor of ten. 21vw is what puts "Mantel." on one line at
 * that width; the clamp floor keeps it from collapsing on a narrow phone and
 * the ceiling stops it outgrowing a very wide monitor.
 */
export const WORDMARK =
  "font-grotesk font-[800] uppercase m-0 leading-[0.78] tracking-[-0.045em] " +
  "text-[clamp(3.25rem,21vw,16rem)]";

/** The micro-label row under the wordmark: small, bold, tracked, grotesque. */
export const MICRO =
  "font-grotesk font-[700] text-[10px] tracking-[0.1em] uppercase leading-[1.35] " +
  "text-[color:var(--ink-muted)]";

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
