import { Minus, Plus } from "lucide-react";
import type { CartItem } from "@/app/types";
import { formatBD } from "@/lib/format";

// Existing-cart row with qty stepper — used only on the Order Before Reach page.
export function CartLineItem({
  item,
  onChangeQty,
}: {
  item: CartItem;
  onChangeQty: (id: string, delta: number) => void;
}) {
  return (
    <div className="py-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[14px] font-medium truncate">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{formatBD(item.price)}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onChangeQty(item.id, -1)}
          className="w-6 h-6 rounded-full border border-border flex items-center justify-center hover:border-foreground/40 transition-colors"
          aria-label={`Remove one ${item.name}`}
        >
          <Minus size={12} strokeWidth={1.5} />
        </button>
        <span className="text-sm w-4 text-center">{item.qty}</span>
        <button
          onClick={() => onChangeQty(item.id, 1)}
          className="w-6 h-6 rounded-full bg-heart-red text-heart-red-foreground flex items-center justify-center hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heart-red"
          aria-label={`Add one ${item.name}`}
        >
          <Plus size={12} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
