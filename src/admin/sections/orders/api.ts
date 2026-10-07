import { rpc, type Result } from "@/admin/lib/db";

export type OrderStatus = "received" | "preparing" | "ready" | "completed" | "cancelled" | "not_collected";

export type OrderItem = { name: string; price: number; quantity: number; kind: "menu" | "object" };

export type OrderEvent = { at: string; kind: string; status: string | null; note: string | null; actor: string | null };

export type Order = {
  id: string;
  reference: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: OrderStatus;
  /** What the customer pays, after any promo code. */
  subtotal: number;
  /** What a promo code took off (supabase/037); 0 when none was used. */
  discount: number;
  promo_code: string | null;
  payment_method: string;
  pickup_at: string | null;
  created_at: string;
  notes: string | null;
  staff_note: string | null;
  cancel_reason: string | null;
  source: "online" | "phone" | "walk-in";
  refunded_amount: number;
  refund_note: string | null;
  status_changed_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  has_account: boolean;
  items: OrderItem[];
  events?: OrderEvent[];
  previous_orders?: number;
};

const n = (v: unknown) => (typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0);

export function normalizeOrder(raw: Order): Order {
  return {
    ...raw,
    subtotal: n(raw.subtotal),
    discount: n(raw.discount),
    promo_code: raw.promo_code ?? null,
    refunded_amount: n(raw.refunded_amount),
    items: (raw.items ?? []).map((i) => ({ ...i, price: n(i.price) })),
  };
}

/** Only retail objects, nothing from the menu: handed over, not made at the bar. */
export const isRetailOrder = (o: Order) => o.items.length > 0 && o.items.every((i) => i.kind === "object");

export const hasObjects = (o: Order) => o.items.some((i) => i.kind === "object");

export type Board = { active: Order[]; done_today: Order[]; server_time: string };

export async function fetchBoard(): Promise<Result<Board>> {
  const r = await rpc<Board>("admin_board");
  if (!r.ok) return r;
  return { ok: true, value: { ...r.value, active: r.value.active.map(normalizeOrder), done_today: r.value.done_today.map(normalizeOrder) } };
}

export type OrderQuery = {
  statuses: OrderStatus[];
  from: string | null;
  to: string | null;
  query: string;
  source: string;
  limit: number;
  offset: number;
};

export type OrderPage = { total: number; revenue: number; rows: Order[] };

export async function fetchOrders(q: OrderQuery): Promise<Result<OrderPage>> {
  const r = await rpc<OrderPage>("admin_orders", {
    p_statuses: q.statuses.length ? q.statuses : null,
    p_from: q.from || null,
    p_to: q.to || null,
    p_query: q.query.trim() || null,
    p_source: q.source || null,
    p_limit: q.limit,
    p_offset: q.offset,
  });
  if (!r.ok) return r;
  return { ok: true, value: { total: n(r.value.total), revenue: n(r.value.revenue), rows: r.value.rows.map(normalizeOrder) } };
}

export async function fetchOrder(id: string): Promise<Result<Order>> {
  const r = await rpc<Order>("admin_order", { p_id: id });
  if (!r.ok) return r;
  return { ok: true, value: normalizeOrder(r.value) };
}

export const setOrderStatus = (id: string, status: OrderStatus, note?: string) =>
  rpc<boolean>("admin_set_order_status", { p_id: id, p_status: status, p_note: note ?? null });

export const bulkOrderStatus = (ids: string[], status: OrderStatus) =>
  rpc<number>("admin_bulk_order_status", { p_ids: ids, p_status: status });

export const refundOrder = (id: string, amount: number, note: string) =>
  rpc<boolean>("admin_refund_order", { p_id: id, p_amount: amount, p_note: note });

export const setStaffNote = (id: string, note: string) =>
  rpc<boolean>("admin_set_order_staff_note", { p_id: id, p_note: note });

export const createManualOrder = (input: {
  items: { id: string; qty: number }[];
  name: string;
  phone: string;
  email: string;
  note: string;
  source: "phone" | "walk-in";
  status: "received" | "completed";
}) =>
  rpc<string>("admin_create_manual_order", {
    p_items: input.items,
    p_name: input.name,
    p_phone: input.phone,
    p_email: input.email,
    p_note: input.note,
    p_source: input.source,
    p_status: input.status,
  });

/* ── Words for each state ─────────────────────────────────────────────── */

export const STATUS: Record<OrderStatus, { label: string; tone: "danger" | "warn" | "ok" | "neutral" | "info" }> = {
  received: { label: "New", tone: "danger" },
  preparing: { label: "Preparing", tone: "warn" },
  ready: { label: "Ready for pickup", tone: "ok" },
  completed: { label: "Collected", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  not_collected: { label: "Not collected", tone: "info" },
};

/** The one obvious next step for an order on the board. */
export const NEXT_STEP: Partial<Record<OrderStatus, { to: OrderStatus; label: string }>> = {
  received: { to: "preparing", label: "Start preparing" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "completed", label: "Collected" },
};

export const CANCEL_REASONS = [
  "Customer asked to cancel",
  "Item sold out",
  "Café closed",
  "Duplicate order",
  "Customer didn't reply",
];

/** A phone number WhatsApp understands: digits only, Bahrain code added to 8-digit locals. */
export function whatsappNumber(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 8) return `973${digits}`;
  if (digits.startsWith("00")) return digits.slice(2);
  return digits.length >= 8 ? digits : null;
}
