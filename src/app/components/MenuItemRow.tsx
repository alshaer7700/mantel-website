import type { MenuItem } from "@/app/types";
import { formatBD } from "@/lib/format";

// Pure display — no cart interaction. Used only by the browse-only Menu page.
export function MenuItemRow({ item }: { item: MenuItem }) {
  return (
    <div className="py-5 flex justify-between items-start gap-6">
      <div>
        <p className="text-[15px] font-medium">{item.name}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
      </div>
      <span className="text-[14px] text-foreground shrink-0">{formatBD(item.price)}</span>
    </div>
  );
}
