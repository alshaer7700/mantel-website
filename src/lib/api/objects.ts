import { supabase } from "@/lib/supabaseClient";
import { toAppError, type AppError } from "@/lib/api/errors";
import { settle } from "@/lib/api/settle";

/*
 * The retail shelf: candles, matches, lighters, whole beans.
 *
 * A separate table from menu_items rather than a sixth category — see
 * supabase/009. The short version: menu_items.category values double as URL
 * segments, and calories/macros mean nothing on a lighter.
 *
 * Objects and drinks meet again server-side, in the `sellables` view, so one
 * bag can hold both and still be priced by the database.
 */

export type ShopObject = {
  id: string;
  name: string;
  /** One printed line: "Soy wax · 220g · 45 hrs". Free text, nothing computes on it. */
  spec: string;
  description: string;
  price: number;
  image_url: string | null;
  /** Which line drawing stands in until a photograph exists. */
  art_key: string | null;
  sort_order: number;
};

const OBJECT_COLUMNS = "id, name, spec, description, price, image_url, art_key, sort_order";

export type ObjectsResult =
  | { ok: true; objects: ShopObject[] }
  | { ok: false; error: AppError };

export async function fetchObjects(): Promise<ObjectsResult> {
  const { data, error } = await settle(supabase
    .from("objects")
    .select(OBJECT_COLUMNS)
    /*
     * Same belt-and-braces as the menu. RLS gates this too, but 008 is the
     * standing proof that a second permissive policy can be added out of band
     * and cancel the first. Here the stakes are identical: 009 lands the real
     * object list at price 0 with is_available = false until prices are
     * confirmed, so a policy regression would list a candle at 0.000.
     */
    .eq("is_available", true)
    .order("sort_order"));

  if (error) return { ok: false, error: toAppError(error) };
  return { ok: true, objects: data ?? [] };
}
