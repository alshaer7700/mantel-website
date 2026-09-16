import { supabase } from "@/lib/supabaseClient";
import { toAppError, type AppError } from "@/lib/api/errors";
import { settle } from "@/lib/api/settle";
import { clearCatalogCache } from "@/lib/api/cache";

export type AdminSummary = {
  orders: number;
  received: number;
  preparing: number;
  ready: number;
  unreadMessages: number;
  activeSubscribers: number;
  availableObjects: number;
};

export type AdminOrder = {
  id: string;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  subtotal: number;
  payment_method: string;
  pickup_at: string | null;
  created_at: string;
};

export type AdminMessage = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  message: string;
  status: string;
  created_at: string;
};

export type AdminSubscriber = {
  email: string;
  status: string;
  subscribed_at: string;
};

export type AdminObject = {
  id: string;
  name: string;
  spec: string;
  description: string;
  price: number;
  is_available: boolean;
  sort_order: number;
};

export type AdminMenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  sort_order: number;
};

export type AdminDashboardData = {
  summary: AdminSummary;
  orders: AdminOrder[];
  messages: AdminMessage[];
  newsletter: AdminSubscriber[];
  objects: AdminObject[];
  menu: AdminMenuItem[];
};

export type AdminResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AppError };

const EMPTY_SUMMARY: AdminSummary = {
  orders: 0,
  received: 0,
  preparing: 0,
  ready: 0,
  unreadMessages: 0,
  activeSubscribers: 0,
  availableObjects: 0,
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function booleanValue(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeDashboard(value: unknown): AdminDashboardData {
  const root = record(value);
  const rawSummary = record(root.summary);

  return {
    summary: {
      orders: numberValue(rawSummary.orders),
      received: numberValue(rawSummary.received),
      preparing: numberValue(rawSummary.preparing),
      ready: numberValue(rawSummary.ready),
      unreadMessages: numberValue(rawSummary.unreadMessages),
      activeSubscribers: numberValue(rawSummary.activeSubscribers),
      availableObjects: numberValue(rawSummary.availableObjects),
    },
    orders: arrayValue(root.orders).map((item) => {
      const row = record(item);
      return {
        id: stringValue(row.id),
        customer_name: stringValue(row.customer_name, "Guest"),
        customer_email: nullableString(row.customer_email),
        customer_phone: nullableString(row.customer_phone),
        status: stringValue(row.status, "received"),
        subtotal: numberValue(row.subtotal),
        payment_method: stringValue(row.payment_method, "cash"),
        pickup_at: nullableString(row.pickup_at),
        created_at: stringValue(row.created_at),
      };
    }),
    messages: arrayValue(root.messages).map((item) => {
      const row = record(item);
      return {
        id: stringValue(row.id),
        first_name: stringValue(row.first_name),
        last_name: stringValue(row.last_name),
        email: stringValue(row.email),
        phone: nullableString(row.phone),
        message: stringValue(row.message),
        status: stringValue(row.status, "new"),
        created_at: stringValue(row.created_at),
      };
    }),
    newsletter: arrayValue(root.newsletter).map((item) => {
      const row = record(item);
      return {
        email: stringValue(row.email),
        status: stringValue(row.status, "active"),
        subscribed_at: stringValue(row.subscribed_at),
      };
    }),
    objects: arrayValue(root.objects).map((item) => {
      const row = record(item);
      return {
        id: stringValue(row.id),
        name: stringValue(row.name),
        spec: stringValue(row.spec),
        description: stringValue(row.description),
        price: numberValue(row.price),
        is_available: booleanValue(row.is_available, true),
        sort_order: numberValue(row.sort_order),
      };
    }),
    menu: arrayValue(root.menu).map((item) => {
      const row = record(item);
      return {
        id: stringValue(row.id),
        name: stringValue(row.name),
        description: stringValue(row.description),
        price: numberValue(row.price),
        category: stringValue(row.category),
        is_available: booleanValue(row.is_available, true),
        sort_order: numberValue(row.sort_order),
      };
    }),
  };
}

export async function fetchAdminDashboard(): Promise<AdminResult<AdminDashboardData>> {
  const { data, error } = await settle(supabase.rpc("admin_dashboard"));
  if (error) return { ok: false, error: toAppError(error) };
  return { ok: true, value: normalizeDashboard(data) };
}

async function callAdminAction(
  request: PromiseLike<{ data: boolean | null; error: { code?: string | null; message?: string | null } | null }>,
): Promise<AdminResult<boolean>> {
  const { data, error } = await settle(request);
  if (error) return { ok: false, error: toAppError(error) };
  if (data !== true) return { ok: false, error: { kind: "unknown", message: "The change could not be saved." } };
  return { ok: true, value: true };
}

export function updateAdminOrderStatus(orderId: string, status: string): Promise<AdminResult<boolean>> {
  return callAdminAction(supabase.rpc("admin_update_order_status", { p_order_id: orderId, p_status: status }));
}

/*
 * The two actions that change what the public catalog says, so both drop the
 * cached copy of it. Without this, a barista who marks the last croissant sold
 * out and then opens the menu to check sees it still listed for up to five
 * minutes, and reasonably concludes the button did nothing.
 *
 * This clears THIS browser only. A customer mid-visit still sees the item
 * until their own entry expires — that is the TTL trade-off written down in
 * src/lib/api/cache.ts, and it is safe because place_order re-checks
 * availability server-side and rejects a sold-out line.
 */
export async function updateAdminObjectAvailability(
  objectId: string,
  isAvailable: boolean,
): Promise<AdminResult<boolean>> {
  const result = await callAdminAction(
    supabase.rpc("admin_update_object_availability", { p_object_id: objectId, p_is_available: isAvailable }),
  );
  if (result.ok) clearCatalogCache();
  return result;
}

export async function updateAdminMenuAvailability(
  menuItemId: string,
  isAvailable: boolean,
): Promise<AdminResult<boolean>> {
  const result = await callAdminAction(
    supabase.rpc("admin_update_menu_availability", { p_menu_item_id: menuItemId, p_is_available: isAvailable }),
  );
  if (result.ok) clearCatalogCache();
  return result;
}

export function updateAdminContactStatus(messageId: string, status: string): Promise<AdminResult<boolean>> {
  return callAdminAction(
    supabase.rpc("admin_update_contact_status", { p_message_id: messageId, p_status: status }),
  );
}

export function updateAdminNewsletterStatus(email: string, status: string): Promise<AdminResult<boolean>> {
  return callAdminAction(
    supabase.rpc("admin_update_newsletter_status", { p_email: email, p_status: status }),
  );
}

export { EMPTY_SUMMARY };
