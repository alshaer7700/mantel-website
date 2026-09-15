import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Minus, Plus, X } from "lucide-react";
import { formatBhd, type CartLine } from "@/app/content/retail";
import { orderReference, type PlaceOrderResult } from "@/lib/api/orders";
import { messageFor } from "@/lib/api/errors";
import { useDialogFocus } from "@/app/hooks/useDialogFocus";

/*
 * One field, on purpose.
 *
 * The checkout used to ask for a name, an email and a mobile — three ruled
 * boxes for a coffee that is paid for at the counter, two of them marked
 * "(optional)", which is a form asking a question it has already admitted it
 * does not need the answer to. An email address is the one thing the order
 * genuinely needs: it is where the reference goes, and it is enough to find
 * the order again. The name the kitchen calls out is derived from it upstream
 * (see App.tsx), so nothing is lost at the counter.
 */
export type CheckoutDetails = {
  customerEmail: string;
};

type Props = {
  open: boolean;
  lines: CartLine[];
  orderingOpen: boolean;
  onClose: () => void;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onCheckout: (details: CheckoutDetails) => Promise<PlaceOrderResult>;
  /** A signed-in customer's address, so the one field arrives already filled. */
  defaultEmail?: string;
  id?: string;
};

export function CartDrawer({
  open,
  lines,
  orderingOpen,
  onClose,
  onIncrement,
  onDecrement,
  onRemove,
  onCheckout,
  defaultEmail,
  id,
}: Props) {
  const itemCount = lines.reduce((total, line) => total + line.quantity, 0);
  const subtotal = lines.reduce((total, line) => total + line.product.price * line.quantity, 0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState(defaultEmail ?? "");
  const [checkoutError, setCheckoutError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  /* The session usually resolves after this mounts, so the address is filled in
     when it arrives — but never over something already typed. */
  useEffect(() => {
    if (defaultEmail) setCustomerEmail((current) => current || defaultEmail);
  }, [defaultEmail]);

  const handleCheckout = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCheckoutError("");
    setSubmitting(true);
    const result = await onCheckout({ customerEmail });
    setSubmitting(false);
    if (!result.ok) {
      setCheckoutError(messageFor(result.error));
      return;
    }
    setOrderId(result.orderId);
    setCheckoutOpen(false);
  };

  const resetAfterClose = () => {
    if (submitting) return;
    setCheckoutOpen(false);
    setCheckoutError("");
    onClose();
  };

  const drawerRef = useRef<HTMLElement>(null);
  useDialogFocus(open, drawerRef, resetAfterClose);

  return (
    <>
      <div
        className={`editorial-cart-backdrop ${open ? "is-open" : ""}`}
        onClick={resetAfterClose}
        aria-hidden="true"
      />
      <aside
        id={id}
        ref={drawerRef}
        className={`editorial-cart-drawer ${open ? "is-open" : ""}`}
        aria-hidden={!open}
        aria-modal="true"
        aria-labelledby="cart-title"
        tabIndex={-1}
      >
        <header className="editorial-cart-header">
          <div>
            <p className="editorial-overline">Your selection</p>
            <h2 id="cart-title">Cart{itemCount > 0 ? ` · ${itemCount}` : ""}</h2>
          </div>
          <button type="button" onClick={resetAfterClose} aria-label="Close cart">
            <X size={20} strokeWidth={1.4} />
          </button>
        </header>

        {orderId ? (
          <div className="editorial-cart-confirmation" role="status">
            <p className="editorial-overline">Order received</p>
            <h3>Your selection is with us.</h3>
            <p>We’ll have it ready for pickup at Mantel. Payment is made at the counter.</p>
            <div className="editorial-cart-reference">
              <span>Reference</span>
              <strong>{orderReference(orderId)}</strong>
            </div>
            <button type="button" className="editorial-cart-continue" onClick={resetAfterClose}>
              Continue browsing
              <ArrowUpRight size={15} strokeWidth={1.4} aria-hidden="true" />
            </button>
          </div>
        ) : lines.length > 0 ? (
          <div className="editorial-cart-lines" aria-live="polite">
            {lines.map((line) => (
              <article className="editorial-cart-line" key={line.product.id}>
                {line.product.image && (
                  <div className={`editorial-cart-line-image ${line.product.tone ? `editorial-object-card-${line.product.tone}` : ""}`}>
                    <img src={line.product.image} alt="" />
                  </div>
                )}
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
            <p>Add something from Order Before Reach or Retail to begin your selection.</p>
          </div>
        )}

        {!orderId && (
          <footer className="editorial-cart-footer">
            <div className="editorial-cart-subtotal">
              <span>Subtotal</span>
              <strong>{formatBhd(subtotal)}</strong>
            </div>
            <p>Pickup at Mantel · Bahrain. Payment at the counter.</p>
            {checkoutError && <p className="editorial-cart-error" role="alert">{checkoutError}</p>}
            {checkoutOpen ? (
              <form className="editorial-cart-checkout" onSubmit={handleCheckout}>
                <label className="editorial-cart-field" htmlFor="cart-email">
                  <span className="editorial-cart-field-label">Email</span>
                  <input
                    id="cart-email"
                    type="email"
                    inputMode="email"
                    value={customerEmail}
                    onChange={(event) => setCustomerEmail(event.target.value)}
                    placeholder="you@example.com"
                    maxLength={254}
                    autoComplete="email"
                    required
                  />
                </label>
                <p className="editorial-cart-field-note">
                  Your order reference goes here. Nothing else — no account needed.
                </p>
                <div className="editorial-cart-checkout-actions">
                  <button
                    type="button"
                    className="editorial-cart-secondary"
                    onClick={() => setCheckoutOpen(false)}
                    disabled={submitting}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="editorial-cart-primary"
                    disabled={submitting || lines.length === 0 || !orderingOpen}
                  >
                    {submitting ? "Sending…" : "Place order"}
                    <ArrowUpRight size={15} strokeWidth={1.4} aria-hidden="true" />
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                className="editorial-cart-primary"
                disabled={lines.length === 0 || !orderingOpen}
                onClick={() => { setCheckoutError(""); setCheckoutOpen(true); }}
              >
                {orderingOpen ? "Continue to checkout" : "Ordering unavailable"}
                <ArrowUpRight size={15} strokeWidth={1.4} aria-hidden="true" />
              </button>
            )}
          </footer>
        )}
      </aside>
    </>
  );
}
