import type { MenuItem } from "@/app/types";
import { formatBD } from "@/lib/format";

// Pure display — no cart interaction. Used only by the browse-only Menu page.
// The rule under each row matches the FAQ accordion exactly: a bottom border
// at foreground/60, with the list container supplying the matching top rule.
export function MenuItemRow({ item }: { item: MenuItem }) {
  return (
    <div className="py-5 flex justify-between items-start gap-6 border-b border-foreground/60">
      <div>
        <p className="font-mono font-medium text-[15px]">{item.name}</p>
        <p className="font-mono font-normal text-sm text-muted-foreground mt-0.5">{item.desc}</p>
      </div>
      <span className="font-mono font-normal text-[14px] tabular-nums text-foreground shrink-0">
        {formatBD(item.price)}
      </span>
    </div>
  );
}
