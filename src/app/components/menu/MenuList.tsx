import { useId, useState } from "react";
import type { MenuItem, MenuCategoryKey } from "@/app/types";
import { formatPrice, formatMacros, CATEGORY_LABELS } from "@/lib/format";
import { LABEL } from "@/app/components/type";

/*
 * The menu, in the design direction's row: name in mono, note in italic
 * serif, a dotted leader running to the price. The leader is the whole idea —
 * it ties a name to its price across the gap without drawing a rule under
 * every row, which is what made the old list read as a spreadsheet.
 *
 * TWO THINGS THE PROTOTYPE DOES NOT HAVE, kept because they are real:
 *
 * 1. Ingredients and nutrition, on hover AND on tap. Those are actual columns
 *    (supabase/006) and the café will fill them. The prototype's row had
 *    nowhere to put them because its menu was invented.
 *
 *    Hover alone would have hidden them from most of the audience: a phone has
 *    no pointer, and this is a café. So the reveal is layered —
 *
 *      pointer devices   opens on hover, via CSS only, no state involved
 *      keyboard          opens on focus-within, so tabbing reaches it
 *      touch             opens on tap, held by React state until tapped again
 *
 *    The hover rule is gated on (hover: hover) and (pointer: fine). Without
 *    that gate, a tap on a touchscreen fires a synthetic mouseenter, the panel
 *    opens on hover AND the click toggles state, and the two fight each other.
 *
 * 2. No "Add" affordance. The prototype reveals one on hover, but ordering is
 *    locked (EXECUTE on place_order is revoked), so an Add control would be a
 *    button that cannot work. It returns with ORDERING_OPEN.
 */

export function MenuList({
  sections,
}: {
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
}) {
  /* A category with nothing available is dropped rather than printed empty.
     Aqua and Desserts are in exactly that state today: every item in them is
     hidden pending a confirmed price. */
  const filled = sections.filter(([, items]) => items.length > 0);

  return (
    <div>
      {filled.map(([key, items]) => (
        <section key={key} className="mb-[52px]">
          <h3 className="font-serif font-normal text-[clamp(1.4rem,3.4vw,2rem)] tracking-[-0.01em] m-0 mb-[var(--s-2)] text-[color:var(--ink)]">
            {CATEGORY_LABELS[key]}
          </h3>
          {items.map((item) => (
            <Row key={item.id} item={item} />
          ))}
        </section>
      ))}
    </div>
  );
}

function Row({ item }: { item: MenuItem }) {
  const [open, setOpen] = useState(false);
  const panelId = `${useId()}-detail`;

  const macros = formatMacros(item);
  /* `!== null` throughout, not truthiness: 0 kcal on a still water is a real
     published figure that a falsy check would hide. */
  const nutrition = [item.calories !== null ? `${item.calories} kcal` : "", macros]
    .filter(Boolean)
    .join(" · ");
  const expandable = Boolean(item.ingredients) || nutrition !== "";

  const row = (
    <>
      <span className="font-mono text-[14px] tracking-[0.01em] text-[color:var(--ink)] shrink-0">
        {item.name}
      </span>
      {item.desc && (
        <span className="font-serif italic text-[0.95rem] text-[color:var(--ink-muted)] shrink-0">
          {item.desc}
        </span>
      )}
      {/* The leader. A dotted bottom border on a flex-grow span, nudged up to
          sit on the type's baseline rather than under its descenders. */}
      <span
        aria-hidden="true"
        className="flex-1 min-w-[1.5rem] border-b border-dotted border-[color:var(--line)] -translate-y-[0.28em]"
      />
      <span className="font-mono text-[13px] tabular-nums whitespace-nowrap text-[color:var(--ink-muted)]">
        {formatPrice(item.price)}
      </span>
    </>
  );

  const SHARED =
    "w-full flex items-baseline gap-[0.85rem] py-[0.72rem] text-left " +
    "border-b border-[color:var(--line-soft)]";

  return (
    <div className="group">
      {expandable ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          className={`${SHARED} transition-[padding-left] duration-300 ease-[cubic-bezier(.16,.84,.44,1)] hover:pl-[0.7rem] focus-visible:pl-[0.7rem] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand)]`}
        >
          {row}
        </button>
      ) : (
        /* Not a button. A control that opens an empty panel is worse than no
           control, and it would put a keyboard stop on every row that has no
           data published yet — which today is all of them. */
        <div className={SHARED}>{row}</div>
      )}

      {expandable && (
        <div
          id={panelId}
          /* Rendered always, shown by CSS. Toggling it in and out of the DOM
             would make the hover rule impossible to express without state,
             and state driven by mouseenter is what breaks on touch. */
          className={`py-[var(--s-2)] pr-[var(--s-4)] ${
            open
              ? "block"
              : "hidden [@media(hover:hover)_and_(pointer:fine)]:group-hover:block " +
                /* :focus-visible, not :focus-within. A tap focuses the button
                   too, so focus-within held the panel open after the second
                   tap had already toggled it shut — it looked like the close
                   was broken. :focus-visible is set for keyboard focus only,
                   which is exactly the case this is here to serve. */
                "group-[:has(:focus-visible)]:block"
          }`}
        >
          {item.ingredients && (
            <>
              <p className={LABEL}>Ingredients</p>
              <p className="font-serif text-[14px] leading-[1.45] text-[color:var(--ink)] mt-[4px]">
                {item.ingredients}
              </p>
            </>
          )}
          {nutrition && (
            <>
              <p className={`${LABEL} ${item.ingredients ? "mt-[var(--s-2)]" : ""}`}>Nutrition</p>
              <p className="font-mono text-[13px] tabular-nums leading-[1.6] text-[color:var(--ink-muted)] mt-[4px]">
                {nutrition}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
