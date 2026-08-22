import { supabase } from "@/lib/supabaseClient";
import { toAppError, type AppError } from "@/lib/api/errors";

/*
 * The first client of place_order. The RPC has existed since 003 and has never
 * been called from this codebase — the "ordering opens soon" button was only
 * ever disabled in the UI.
 *
 * Read supabase/003→005 before changing anything here. The contract that
 * matters: PRICES ARE NOT SENT. The function resolves name and price from
 * menu_items itself and computes the subtotal server-side, because the anon
 * key ships in the JS bundle and anything priced by this file would be priced
 * by whoever holds it. Send ids and quantities, nothing else.
 */

/** Mirrors the RPC's own bounds so a bad bag fails here instead of over the wire. */
export const MAX_LINE_ITEMS = 50;
export const MAX_QTY_PER_LINE = 50;

export type OrderLine = {
  /** menu_items.id — a uuid the server looks up. Never a name, never a price. */
  menuItemId: string;
  qty: number;
};

export type PlaceOrderInput = {
  lines: readonly OrderLine[];
  customerName: string;
  /** Optional: the RPC accepts null, and guest checkout must stay possible. */
  customerEmail?: string | null;
  /**
   * The pickup contact. Optional to the database, but the checkout asks for it
   * because a counter with a ready order and no way to call anyone is the
   * whole problem it solves.
   */
  customerPhone?: string | null;
  /**
   * When they want to collect. Null means "as soon as it's ready", which the
   * RPC accepts. Anything in the past (beyond 5 minutes of clock skew) or more
   * than 24 hours out is rejected server-side.
   */
  pickupAt?: Date | null;
  /**
   * 'cash' is pay-at-counter. Card is not wired to any gateway — roadmap
   * Phase 4 — so nothing should pass 'card' until a hosted checkout exists.
   */
  paymentMethod: "cash" | "card";
};

export type PlaceOrderResult =
  | { ok: true; orderId: string }
  | { ok: false; error: AppError };

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const invalid = validate(input);
  if (invalid) return { ok: false, error: { kind: "unknown", message: invalid } };

  const { data, error } = await supabase.rpc("place_order", {
    items: input.lines.map((l) => ({ menu_item_id: l.menuItemId, qty: l.qty })),
    customer_name: input.customerName.trim().slice(0, 120),
    /*
     * undefined, not null, when there is no email: the parameter is DEFAULT
     * null in SQL, and letting the default apply keeps this call correct
     * across the signature change in 009.
     */
    customer_email: input.customerEmail?.trim().slice(0, 254) || undefined,
    customer_phone: input.customerPhone?.trim().slice(0, 24) || undefined,
    /*
     * ISO 8601 with an offset, which is what timestamptz wants. Sending a
     * local-looking string would have Postgres read it in the server's zone
     * rather than the customer's, and quietly book a pickup an hour out.
     */
    pickup_at: input.pickupAt ? input.pickupAt.toISOString() : undefined,
    payment_method: input.paymentMethod,
  });

  if (error) return { ok: false, error: toAppError(error) };
  if (!data) return { ok: false, error: { kind: "unknown", message: "No order id returned." } };

  return { ok: true, orderId: data };
}

/*
 * Client-side echo of the server's own checks, for speed of feedback only. The
 * server re-validates every one of these and is the only authority; nothing
 * here is a security control, and removing it would change no guarantee.
 */
function validate(input: PlaceOrderInput): string | null {
  if (input.lines.length === 0) return "Your bag is empty.";
  if (input.lines.length > MAX_LINE_ITEMS) return "That is too many separate items for one order.";
  if (input.lines.some((l) => !Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY_PER_LINE)) {
    return "One of the quantities in your bag isn't valid.";
  }
  if (input.customerName.trim() === "") return "Enter the name for the order.";
  return null;
}

/**
 * The reference a customer reads back at the counter.
 *
 * Derived from the order's uuid rather than randomly generated, so the paper
 * slip, the confirmation screen and the orders table all say the same thing —
 * the prototype invented an unrelated "MTL-1234" that matched no stored row,
 * which is useless the moment someone asks staff to look an order up.
 */
export function orderReference(orderId: string): string {
  return `MTL-${orderId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
