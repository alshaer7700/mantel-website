import { Minus, Plus, X } from "lucide-react";
import { formatBhd, type CartLine } from "@/app/content/retail";

type Props = {
  open: boolean;
  lines: CartLine[];
  onClose: () => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
};

export function CartDrawer({
  open,
  lines,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
}: Props) {
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  const subtotal = lines.reduce((total, line) => total + line.product.price * line.quantity, 0);

  return (
    <>
      <div
        className={`editorial-cart-backdrop ${open ? "is-open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`editorial-cart-drawer ${open ? "is-open" : ""}`}
        aria-hidden={!open}
        aria-label="Shopping cart"
      >
        <header className="editorial-cart-header">
          <div>
            <p className="editorial-overline">Your selection</p>
            <h2>Cart{itemCount > 0 ? ` · ${itemCount}` : ""}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close cart">
            <X size={20} strokeWidth={1.4} />
          </button>
        </header>

        {lines.length > 0 ? (
          <div className="editorial-cart-lines">
            {lines.map((line) => (
              <article className="editorial-cart-line" key={line.product.id}>
                <div className={`editorial-cart-line-image editorial-object-card-${line.product.tone}`}>
                  <img src={line.product.image} alt="" />
                </div>
                <div className="editorial-cart-line-info">
                  <div className="editorial-cart-line-heading">
                    <div>
                      <h3>{line.product.name}</h3>
                      <p>{formatBhd(line.product.price)}</p>
                    </div>
                    <button type="button" onClick={() => onRemove(line.product.id)} aria-label={`Remove ${line.product.name}`}>
                      <X size={14} strokeWidth={1.4} />
                    </button>
                  </div>
                  <div className="editorial-cart-line-controls">
                    <div className="editorial-cart-quantity" aria-label={`Quantity ${line.quantity}`}>
                      <button type="button" onClick={() => onDecrement(line.product.id)} aria-label={`Decrease ${line.product.name}`}>
                        <Minus size={13} strokeWidth={1.5} />
                      </button>
                      <span>{line.quantity}</span>
                      <button type="button" onClick={() => onIncrement(line.product.id)} aria-label={`Increase ${line.product.name}`}>
                        <Plus size={13} strokeWidth={1.5} />
                      </button>
                    </div>
                    <strong>{formatBhd(line.product.price * line.quantity)}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="editorial-cart-empty">
            <p className="editorial-cart-empty-title">Your bag is empty.</p>
            <p>Add an object from Retail to begin your selection.</p>
          </div>
        )}

        <footer className="editorial-cart-footer">
          <div className="editorial-cart-subtotal">
            <span>Subtotal</span>
            <strong>{formatBhd(subtotal)}</strong>
          </div>
          <p>Pickup and payment options will be confirmed at Mantel.</p>
          <button type="button" disabled={lines.length === 0}>
            Checkout coming soon
          </button>
        </footer>
      </aside>
    </>
  );
}
