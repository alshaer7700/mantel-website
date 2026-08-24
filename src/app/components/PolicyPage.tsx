import type { LegalDoc } from "@/app/content/legal";
import { LABEL, DISPLAY } from "@/app/components/type";

/*
 * Shared layout for Privacy / Terms / Refund — a display title over quiet
 * prose.
 *
 * The section headings used to be set in semibold serif, uppercase and
 * tracked out: a label wearing a heading's face. Labels are Fira Mono here,
 * and the title drops to the one serif weight the rest of the site uses.
 */
export function PolicyPage({ doc }: { doc: LegalDoc }) {
  return (
    <div className="flex-1 w-full px-[var(--pad)] pt-[clamp(3rem,9vh,6rem)] pb-[clamp(3rem,9vh,6rem)]">
      <h1 className={`${DISPLAY} text-[clamp(1.9rem,5vw,3.4rem)] m-0 mb-[var(--s-2)] text-[color:var(--ink)]`}>
        {doc.title}
      </h1>
      <p className={`${LABEL} mb-[var(--s-5)]`}>
        Last updated {doc.updated}
      </p>
      <div className="flex flex-col gap-8">
        {doc.sections.map((section, i) => (
          <section key={i}>
            {section.heading && (
              <h2 className={`${LABEL} text-[color:var(--ink)] mb-[var(--s-1)]`}>
                {section.heading}
              </h2>
            )}
            <div className="flex flex-col gap-3">
              {section.paragraphs.map((p, j) => (
                <p key={j} className="font-mono text-[length:var(--fs-desc)] leading-[1.7] max-w-[68ch] text-[color:var(--ink-muted)]">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
