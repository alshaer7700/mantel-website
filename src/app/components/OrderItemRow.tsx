import { Plus } from "lucide-react";
import type { MenuItem } from "@/app/types";
import { formatBD } from "@/lib/format";

// Browse + add-to-cart row — used only on the Order Before Reach page.
export function OrderItemRow({
  item,
  onAdd,
}: {
  item: MenuItem;
  onAdd: (item: MenuItem) => void;
}) {
  return (
    <div className="py-5 flex justify-between items-start gap-6">
      <div>
        <p className="text-[15px] font-medium">{item.name}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[14px] text-foreground">{formatBD(item.price)}</span>
        <button
          onClick={() => onAdd(item)}
          className="w-7 h-7 rounded-full bg-heart-red text-heart-red-foreground flex items-center justify-center hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heart-red"
          aria-label={`Add ${item.name} to bag`}
        >
          <Plus size={14} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}
