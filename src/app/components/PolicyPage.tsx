import type { LegalDoc } from "@/app/content/legal";

/* Shared layout for Privacy / Terms / Refund pages — big display title,
   quiet prose sections, matching the site's minimal black-on-white look. */
export function PolicyPage({ doc }: { doc: LegalDoc }) {
  return (
    <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-14">
      <h1 className="font-serif font-semibold text-[length:var(--fs-section-title)] leading-[0.96] mb-2">{doc.title}</h1>
      <p className="font-mono font-normal text-[11px] tracking-[0.14em] uppercase text-muted-foreground mb-12">
        Last updated {doc.updated}
      </p>
      <div className="flex flex-col gap-8">
        {doc.sections.map((section, i) => (
          <section key={i}>
            {section.heading && (
              <h2 className="font-serif font-semibold text-[14px] tracking-[0.18em] uppercase text-foreground mb-3">
                {section.heading}
              </h2>
            )}
            <div className="flex flex-col gap-3">
              {section.paragraphs.map((p, j) => (
                <p key={j} className="font-mono font-normal text-sm leading-relaxed text-muted-foreground">
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
