import { db, rpc, run, type Result } from "@/admin/lib/db";

export type Category = {
  slug: string;
  label: string;
  label_ar: string;
  sort_order: number;
  is_visible: boolean;
};

export type MenuItemRow = {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  description_ar: string;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
  sort_order: number;
  ingredients: string | null;
  ingredients_ar: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  badges: string[];
  allergens: string[];
  diet: string[];
  archived_at: string | null;
  sold_out_until: string | null;
  available_from: string | null;
  available_until: string | null;
  available_start: string | null;
  available_end: string | null;
  updated_at: string;
};

export type ObjectRow = {
  id: string;
  slug: string;
  name: string;
  name_ar: string;
  spec: string;
  spec_ar: string;
  description: string;
  description_ar: string;
  story: string;
  story_ar: string;
  care: string;
  care_ar: string;
  collection: string;
  collection_ar: string;
  price: number;
  image_url: string | null;
  images: string[];
  /** Photos all the way round, front first, for the website's 360° turn. */
  spin_images: string[];
  art_key: string | null;
  is_available: boolean;
  sort_order: number;
  stock_qty: number | null;
  low_stock_at: number;
  badges: string[];
  archived_at: string | null;
  sold_out_until: string | null;
  updated_at: string;
};

export type OptionChoice = {
  id: string;
  group_id: string;
  name: string;
  name_ar: string;
  price_delta: number;
  is_available: boolean;
  is_default: boolean;
  sort_order: number;
};

export type OptionGroup = {
  id: string;
  name: string;
  name_ar: string;
  min_select: number;
  max_select: number;
  sort_order: number;
  choices: OptionChoice[];
};

export type ItemOptionLink = { menu_item_id: string; group_id: string; sort_order: number };

export type MenuData = {
  categories: Category[];
  items: MenuItemRow[];
  groups: OptionGroup[];
  links: ItemOptionLink[];
};

const num = (v: unknown): number => (typeof v === "string" ? Number(v) : typeof v === "number" ? v : 0);
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : num(v));

export async function loadMenuData(): Promise<Result<MenuData>> {
  const [cats, items, groups, choices, links] = await Promise.all([
    run<Category[]>(db.from("menu_categories").select("*").order("sort_order").order("label")),
    run<MenuItemRow[]>(db.from("menu_items").select("*").order("sort_order").order("name")),
    run<Omit<OptionGroup, "choices">[]>(db.from("option_groups").select("*").order("sort_order").order("name")),
    run<OptionChoice[]>(db.from("option_choices").select("*").order("sort_order").order("name")),
    run<ItemOptionLink[]>(db.from("menu_item_option_groups").select("*").order("sort_order")),
  ]);
  for (const r of [cats, items, groups, choices, links]) if (!r.ok) return r as Result<never>;
  if (!cats.ok || !items.ok || !groups.ok || !choices.ok || !links.ok) return { ok: false, error: "" };
  return {
    ok: true,
    value: {
      categories: cats.value ?? [],
      items: (items.value ?? []).map((i) => ({
        ...i,
        price: num(i.price),
        protein_g: numOrNull(i.protein_g),
        carbs_g: numOrNull(i.carbs_g),
        fat_g: numOrNull(i.fat_g),
        badges: i.badges ?? [],
        allergens: i.allergens ?? [],
        diet: i.diet ?? [],
      })),
      groups: (groups.value ?? []).map((g) => ({
        ...g,
        choices: (choices.value ?? []).filter((c) => c.group_id === g.id).map((c) => ({ ...c, price_delta: num(c.price_delta) })),
      })),
      links: links.value ?? [],
    },
  };
}

export async function loadObjects(): Promise<Result<ObjectRow[]>> {
  const r = await run<ObjectRow[]>(db.from("objects").select("*").order("sort_order").order("name"));
  if (!r.ok) return r;
  return { ok: true, value: (r.value ?? []).map((o) => ({ ...o, price: num(o.price), images: o.images ?? [], spin_images: o.spin_images ?? [], badges: o.badges ?? [] })) };
}

export function saveMenuItem(item: Partial<MenuItemRow> & { id?: string }): Promise<Result<MenuItemRow>> {
  const { id, updated_at: _u, ...fields } = item;
  void _u;
  const payload = { ...fields, updated_at: new Date().toISOString() };
  return id
    ? run<MenuItemRow>(db.from("menu_items").update(payload).eq("id", id).select().single())
    : run<MenuItemRow>(db.from("menu_items").insert(payload).select().single());
}

export function saveObject(item: Partial<ObjectRow> & { id?: string }): Promise<Result<ObjectRow>> {
  const { id, updated_at: _u, ...fields } = item;
  void _u;
  const payload = { ...fields, updated_at: new Date().toISOString() };
  return id
    ? run<ObjectRow>(db.from("objects").update(payload).eq("id", id).select().single())
    : run<ObjectRow>(db.from("objects").insert(payload).select().single());
}

export const deleteMenuItem = (id: string) => run(db.from("menu_items").delete().eq("id", id));
export const deleteObject = (id: string) => run(db.from("objects").delete().eq("id", id));

export const setSoldOut = (kind: "menu" | "object", id: string, soldOut: boolean) =>
  rpc<string | null>("admin_set_sold_out", { p_kind: kind, p_id: id, p_sold_out: soldOut });

export const reorder = (kind: "menu" | "object" | "option_group" | "option_choice", ids: string[]) =>
  rpc<boolean>("admin_reorder", { p_kind: kind, p_ids: ids });

export const reorderCategories = (slugs: string[]) => rpc<boolean>("admin_reorder_categories", { p_slugs: slugs });

export const duplicateItem = (kind: "menu" | "object", id: string) => rpc<string>("admin_duplicate_item", { p_kind: kind, p_id: id });

export const bulkPrice = (kind: "menu" | "object", category: string | null, percent: number, roundTo: number) =>
  rpc<number>("admin_bulk_price", { p_kind: kind, p_category: category, p_percent: percent, p_round_to: roundTo });

export const setItemOptions = (itemId: string, groupIds: string[]) =>
  rpc<boolean>("admin_set_item_options", { p_item_id: itemId, p_group_ids: groupIds });

export function saveCategory(cat: Category, isNew: boolean): Promise<Result<Category>> {
  return isNew
    ? run<Category>(db.from("menu_categories").insert(cat).select().single())
    : run<Category>(db.from("menu_categories").update({ label: cat.label, label_ar: cat.label_ar, is_visible: cat.is_visible }).eq("slug", cat.slug).select().single());
}

export const deleteCategory = (slug: string) => run(db.from("menu_categories").delete().eq("slug", slug));

export async function saveOptionGroup(group: OptionGroup, isNew: boolean): Promise<Result<string>> {
  const fields = { name: group.name, name_ar: group.name_ar, min_select: group.min_select, max_select: group.max_select, sort_order: group.sort_order };
  const saved = isNew
    ? await run<{ id: string }>(db.from("option_groups").insert(fields).select("id").single())
    : await run<{ id: string }>(db.from("option_groups").update(fields).eq("id", group.id).select("id").single());
  if (!saved.ok) return saved;
  const groupId = saved.value.id;
  const keep = group.choices.filter((c) => !c.id.startsWith("new-")).map((c) => c.id);
  const removed = await run(
    keep.length
      ? db.from("option_choices").delete().eq("group_id", groupId).not("id", "in", `(${keep.join(",")})`)
      : db.from("option_choices").delete().eq("group_id", groupId),
  );
  if (!removed.ok) return removed;
  for (const [index, c] of group.choices.entries()) {
    const row = { group_id: groupId, name: c.name, name_ar: c.name_ar, price_delta: c.price_delta, is_available: c.is_available, is_default: c.is_default, sort_order: index + 1 };
    const r = c.id.startsWith("new-")
      ? await run(db.from("option_choices").insert(row))
      : await run(db.from("option_choices").update(row).eq("id", c.id));
    if (!r.ok) return r;
  }
  return { ok: true, value: groupId };
}

export const deleteOptionGroup = (id: string) => run(db.from("option_groups").delete().eq("id", id));

/* ── Labels ─────────────────────────────────────────────────────────────── */

export const BADGES = [
  { value: "new", label: "New" },
  { value: "signature", label: "Signature" },
  { value: "seasonal", label: "Seasonal" },
  { value: "bestseller", label: "Best seller" },
  { value: "limited", label: "Limited" },
];

export const ALLERGENS = [
  { value: "dairy", label: "Dairy" },
  { value: "gluten", label: "Gluten" },
  { value: "nuts", label: "Tree nuts" },
  { value: "peanuts", label: "Peanuts" },
  { value: "egg", label: "Egg" },
  { value: "soy", label: "Soy" },
  { value: "sesame", label: "Sesame" },
  { value: "fish", label: "Fish" },
  { value: "shellfish", label: "Shellfish" },
];

export const DIET = [
  { value: "vegan", label: "Vegan" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "gluten-free", label: "Gluten-free" },
  { value: "dairy-free", label: "Dairy-free" },
  { value: "sugar-free", label: "No added sugar" },
];

/* ── Status, as the manager thinks about it ─────────────────────────────── */

export type ItemStatus = "live" | "hidden" | "soldout" | "scheduled" | "archived" | "outofstock";

function bahrainNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bahrain", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour").replace("24", "00")}:${get("minute")}` };
}

export function itemStatus(i: {
  is_available: boolean;
  archived_at: string | null;
  sold_out_until: string | null;
  available_from?: string | null;
  available_until?: string | null;
  available_start?: string | null;
  available_end?: string | null;
  stock_qty?: number | null;
}): ItemStatus {
  if (i.archived_at) return "archived";
  if (!i.is_available) return "hidden";
  if (i.sold_out_until && new Date(i.sold_out_until).getTime() > Date.now()) return "soldout";
  if (i.stock_qty !== undefined && i.stock_qty !== null && i.stock_qty <= 0) return "outofstock";
  const now = bahrainNow();
  if (i.available_from && now.date < i.available_from) return "scheduled";
  if (i.available_until && now.date > i.available_until) return "scheduled";
  if (i.available_start && i.available_end) {
    const s = i.available_start.slice(0, 5);
    const e = i.available_end.slice(0, 5);
    const inside = s <= e ? now.time >= s && now.time <= e : now.time >= s || now.time <= e;
    if (!inside) return "scheduled";
  }
  return "live";
}

export const STATUS_LABEL: Record<ItemStatus, { label: string; tone: "ok" | "neutral" | "warn" | "danger" | "info" }> = {
  live: { label: "On the website", tone: "ok" },
  hidden: { label: "Hidden", tone: "neutral" },
  soldout: { label: "Sold out today", tone: "warn" },
  scheduled: { label: "Not showing right now", tone: "info" },
  archived: { label: "Archived", tone: "neutral" },
  outofstock: { label: "Out of stock", tone: "danger" },
};
