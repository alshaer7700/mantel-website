import type { Profile } from "@/app/types";

// localStorage is user-editable (and shared with anything else running on the
// origin), so nothing read from it is trusted: every value is shape-checked
// and clamped before it reaches app state. A bad entry degrades to the empty
// state instead of crashing the render or showing NaN totals.

const MAX_TEXT = 254;

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
