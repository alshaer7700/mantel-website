import type { CartItem, Profile } from "@/app/types";

// localStorage is user-editable (and shared with anything else running on the
// origin), so nothing read from it is trusted: every value is shape-checked
// and clamped before it reaches app state. A bad entry degrades to the empty
// state instead of crashing the render or showing NaN totals.

const MAX_CART_LINES = 50;
const MAX_QTY = 50;
const MAX_TEXT = 254;

const isFiniteNumber = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export function loadCart(key: string): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "[]");
    if (!Array.isArray(raw)) return [];
    const seen = new Set<string>();
    const cart: CartItem[] = [];
    for (const x of raw) {
      if (cart.length >= MAX_CART_LINES) break;
      if (
        !x || typeof x !== "object" ||
        typeof x.id !== "string" || x.id.length === 0 || x.id.length > 64 ||
        typeof x.name !== "string" || x.name.length === 0 ||
        !isFiniteNumber(x.price) || x.price < 0 ||
        !isFiniteNumber(x.qty) ||
        seen.has(x.id)
      ) continue;
      seen.add(x.id);
      cart.push({
        id: x.id,
        name: x.name.slice(0, MAX_TEXT),
        price: x.price,
        qty: Math.min(Math.max(Math.trunc(x.qty), 1), MAX_QTY),
      });
    }
    return cart;
  } catch {
    return [];
  }
}

export function loadProfile(key: string): Profile | null {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || "null");
    if (
      !raw || typeof raw !== "object" ||
      typeof raw.name !== "string" || raw.name.trim() === "" ||
      typeof raw.email !== "string" || raw.email.trim() === ""
    ) return null;
    return {
      name: raw.name.slice(0, 120),
      email: raw.email.slice(0, MAX_TEXT),
    };
  } catch {
    return null;
  }
}
