import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { FaqItem } from "@/app/content/legal";

/* Accordion styled after the inspiration reference: uppercase questions on
   thin full-width rules, chevron rotating open, quiet answer text. */
export function FaqAccordion({ items }: { items: FaqItem[] }) {
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
            <span className="font-mono font-medium text-[13px] tracking-[0.08em] uppercase">
              {item.question}
            </span>
            <ChevronDown
              size={16}
              strokeWidth={1.5}
              className={`shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
            />
          </button>
          {open === i && (
            <p className="pb-5 pr-8 font-mono font-normal text-sm leading-relaxed text-muted-foreground">
              {item.answer}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
