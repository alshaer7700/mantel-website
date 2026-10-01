import type { LegalDoc } from "@/app/content/legal";
import type { PageStyles } from "@/lib/content/pages";
import { Styled } from "@/app/components/Styled";

/* Shared layout for Privacy / Terms / Refund pages — big display title,
   quiet prose sections, matching the site's minimal black-on-white look. */
export function PolicyPage({ doc, styles }: { doc: LegalDoc; styles?: PageStyles }) {
  return (
    <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-14">
      <h1 className="font-serif font-semibold text-[length:var(--fs-section-title)] leading-[0.96] mb-2"><Styled styles={styles} field="title">{doc.title}</Styled></h1>
      <p className="font-mono font-normal text-[11px] tracking-[0.14em] uppercase text-muted-foreground mb-12">
        <Styled styles={styles} field="updated">Last updated {doc.updated}</Styled>
      </p>
      <div className="flex flex-col gap-8">
        {doc.sections.map((section, i) => (
          <section key={i}>
            {section.heading && (
              <h2 className="font-serif font-semibold text-[14px] tracking-[0.18em] uppercase text-foreground mb-3">
                <Styled styles={styles} field="sections.heading">{section.heading}</Styled>
              </h2>
            )}
            <div className="flex flex-col gap-3">
              {section.paragraphs.map((p, j) => (
                <p key={j} className="font-mono font-normal text-sm leading-relaxed text-muted-foreground">
                  <Styled styles={styles} field="sections.body">{p}</Styled>
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
