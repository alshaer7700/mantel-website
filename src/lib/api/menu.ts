import { supabase } from "@/lib/supabaseClient";
import { toAppError, type AppError } from "@/lib/api/errors";
import { settle } from "@/lib/api/settle";
import { MENU_CATEGORIES } from "@/app/types";
import type { MenuItem, MenuCategoryKey } from "@/app/types";

/*
 * The menu read. This used to live inline in a useEffect in App.tsx, which put
 * the column list, the availability guard, the sort and the error handling
 * inside a component that also rendered a header and a contact form.
 *
 * One string literal, not a concatenation: supabase-js parses the select list
 * at the type level and can only do that for a literal.
 */
const MENU_COLUMNS =
  "id, name, desc:description, price, category, image_url, is_available, sort_order, ingredients, calories, protein_g, carbs_g, fat_g";

export type MenuResult =
  | { ok: true; items: MenuItem[] }
  | { ok: false; error: AppError };

export async function fetchMenu(): Promise<MenuResult> {
  const { data, error } = await settle(supabase
    .from("menu_items")
    .select(MENU_COLUMNS)
    /*
     * Belt and braces on availability. RLS already gates this
     * ("using is_available = true"), but relying on that alone put the whole
     * guarantee in one place — and that place turned out to be wrong: a
     * second, permissive policy added outside this repo ORed with the first
     * and made every row public, unpriced items included (see supabase/008).
     * A filter here means a policy regression shows up as a missing item
     * rather than a drink listed at 0.000. Do not remove it on the grounds
     * that RLS covers it; that is exactly the reasoning that failed.
     */
    .eq("is_available", true)
    .order("category")
    .order("sort_order"));

  if (error) return { ok: false, error: toAppError(error) };

  return { ok: true, items: (data ?? []).filter(isKnownCategory) };
}

/*
 * `category` is a text column with a check constraint, not a Postgres enum, so
 * the generated type is `string` and the DB's constraint cannot narrow it for
 * us. A row whose category the app doesn't know would otherwise flow into
 * grouping code as a MenuCategoryKey it can't render.
 *
 * Dropping unknown rows is the safe direction: a category added by a migration
 * before the app knows about it goes missing from the site rather than
 * crashing it, and CATEGORY_LABELS is where you'd notice.
 */
function isKnownCategory<T extends { category: string }>(
  row: T,
): row is T & { category: MenuCategoryKey } {
  return (MENU_CATEGORIES as readonly string[]).includes(row.category);
}

/**
 * Grouped in MENU_CATEGORIES order, not in whatever order Postgres returned:
 * the query's `.order("category")` sorts alphabetically, which would print
 * Aqua before Coffee. The printed menu's order is the tuple's order, and the
 * category sort exists only to keep sort_order stable within each group.
 */
export function groupByCategory(
  items: readonly MenuItem[],
): ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]> {
  return MENU_CATEGORIES.map(
    (key) => [key, items.filter((i) => i.category === key)] as const,
  );
}
