import { supabase } from "@/lib/supabaseClient";
import { toAppError, type AppError } from "@/lib/api/errors";
import { settle } from "@/lib/api/settle";
import { retryMessage, takeSlot } from "@/lib/limiter";

/*
 * Client wrapper for the secure place_order RPC. The RPC resolves product
 * identity and prices from the live sellables view, so the browser sends only
 * backend UUIDs and quantities.
 *
 * Read supabase/003→005 before changing anything here. The contract that
 * matters: PRICES ARE NOT SENT. The function resolves name and price from the
 * sellables view and computes the subtotal server-side, because the anon
 * key ships in the JS bundle and anything priced by this file would be priced
 * by whoever holds it. Send ids and quantities, nothing else.
 */

/** Mirrors the RPC's own bounds so a bad bag fails here instead of over the wire. */
export const MAX_LINE_ITEMS = 50;
export const MAX_QTY_PER_LINE = 50;

export type OrderLine = {
  /** A UUID from the live sellables view. Never a name, never a price. */
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

  /*
   * After validation, before the request: a bag that failed the checks above
   * never reached Supabase, so it must not spend a slot. See src/lib/limiter.ts
   * for why this sits outside the server's window rather than inside it — the
   * per-email and per-IP limits in supabase/009 are the authority, and this
   * only catches a client that has stopped behaving like a customer.
   */
  const slot = takeSlot("order");
  if (!slot.allowed) {
    return { ok: false, error: { kind: "rate-limited", message: retryMessage(slot.retryAfterMs) } };
  }

  const { data, error } = await settle(supabase.rpc("place_order", {
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
  }));

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

export type MyOrderLine = { name: string; price: number; quantity: number };

export type MyOrder = {
  id: string;
  status: string;
  subtotal: number;
  createdAt: string;
  lines: MyOrderLine[];
};

/*
 * The account's own order history. orders carries user_id (010) and
 * orders_select_own / order_items_select_own already scope both tables to
 * the signed-in customer, so this is a plain read — no RPC, nothing to
 * validate, RLS is the whole guarantee.
 */
export async function listMyOrders(userId: string): Promise<MyOrder[] | null> {
  const { data, error } = await settle(
    supabase
      .from("orders")
      .select("id, status, subtotal, created_at, order_items(item_name, item_price, quantity)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  );
  if (error || !data) return null;

  return data.map((order) => ({
    id: order.id,
    status: order.status,
    subtotal: Number(order.subtotal),
    createdAt: order.created_at,
    lines: (order.order_items ?? []).map((line) => ({
      name: line.item_name,
      price: Number(line.item_price),
      quantity: line.quantity,
    })),
  }));
}
