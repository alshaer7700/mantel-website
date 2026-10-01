import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/app/content/legal";
import type { PageStyles } from "@/lib/content/pages";
import { Styled } from "@/app/components/Styled";

/* Accordion styled after the inspiration reference: uppercase questions on
   thin full-width rules, chevron rotating open, quiet answer text. */
export function FaqAccordion({ items, styles }: { items: FaqItem[]; styles?: PageStyles }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="border-t border-foreground/60">
      {items.map((item, i) => (
        <div key={i} className="border-b border-foreground/60">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="w-full flex items-center justify-between gap-4 py-5 text-left hover:opacity-60 transition-opacity"
          >
            <span className="font-serif font-medium text-[14px] tracking-[0.08em] uppercase">
              <Styled styles={styles} field="items.question">{item.question}</Styled>
            </span>
            <ChevronDown
              size={16}
              strokeWidth={1.5}
              className={`shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
            />
          </button>
          {open === i && (
            <p className="pb-5 pr-8 font-mono font-normal text-sm leading-relaxed text-muted-foreground">
              <Styled styles={styles} field="items.answer">{item.answer}</Styled>
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
