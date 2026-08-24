import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/app/content/legal";
import { LABEL } from "@/app/components/type";

/* Accordion styled after the inspiration reference: uppercase questions on
   thin full-width rules, chevron rotating open, quiet answer text. */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="border-t border-[color:var(--line)]">
      {items.map((item, i) => (
        <div key={i} className="border-b border-[color:var(--line)]">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
            className="w-full flex items-center justify-between gap-4 py-5 text-left hover:opacity-60 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand)]"
          >
            <span className={`${LABEL} text-[color:var(--ink)] text-left`}>
              {item.question}
            </span>
            <ChevronDown
              size={16}
              strokeWidth={1.5}
              className={`shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
            />
          </button>
          {open === i && (
            <p className="pb-5 pr-8 font-mono text-[length:var(--fs-desc)] leading-[1.7] max-w-[68ch] text-[color:var(--ink-muted)]">
              {item.answer}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
