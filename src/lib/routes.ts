import { MENU_CATEGORIES } from "@/app/types";
import type { Page, MenuCategory } from "@/app/types";

/*
 * The single source of truth for page ↔ URL. `page` used to be pure component
 * state, so the address bar never moved: nothing was linkable, Back left the
 * site, and a direct hit on /menu was a 404 because the server had no rule for
 * it. Every navigation now goes through here, and the host config
 * (netlify.toml) rewrites unknown paths to index.html so a refresh on a deep
 * link still boots the app.
 *
 * The menu carries a category in the path — /menu/coffee, /menu/sandwiches —
 * so a section can be linked, bookmarked and shared. Bare /menu is everything.
 * A single product does the same under the shelf: /objects/candles.
 */

/*
 * Every page that owns a path of its own. A single product does not — it is
 * always /objects/<id> — so it is absent from this map and handled in both
 * functions below. Keeping it out is what stops bare /objects resolving to a
 * product page with no product.
 */
export const ROUTES: Record<Exclude<Page, "object">, string> = {
  home: "/",
  menu: "/menu",
  ritual: "/friday-espresso",
  pickup: "/pickup",
  objects: "/objects",
  story: "/story",
  contact: "/contact",
  faq: "/faq",
  privacy: "/privacy",
  terms: "/terms",
  refund: "/refund",
  admin: "/admin",
};

/**
 * Category slugs double as the DB `category` values, so no mapping is needed —
 * which is also why the taxonomy is imported rather than restated here. /menu/food
 * is not in the list any more and now degrades to the full menu, as any other
 * unknown slug does.
 */
const CATEGORIES: readonly string[] = MENU_CATEGORIES;

export type Route = {
  page: Page;
  menuCategory: MenuCategory;
  /** The product id, for /objects/<id>. Null on every other page. */
  objectId: string | null;
};

export function pathFor(
  page: Page,
  menuCategory: MenuCategory = null,
  objectId: string | null = null,
): string {
  /* First, so the rest of the function sees a page that ROUTES has a key for.
     A product page without a product is just the shelf. */
  if (page === "object") return objectId ? `${ROUTES.objects}/${objectId}` : ROUTES.objects;
  if (page === "menu" && menuCategory) return `${ROUTES.menu}/${menuCategory}`;
  return ROUTES[page];
}

const BY_PATH = new Map<string, Page>(
  (Object.entries(ROUTES) as [Page, string][]).map(([page, path]) => [path, page]),
);

function normalise(pathname: string): string {
  return pathname.toLowerCase().replace(/\/+$/, "") || "/";
}

/**
 * Resolve a pathname to a page and, for the menu, a category. Trailing slashes
 * and case are normalised, so /Menu/Coffee/ and /menu/coffee land together.
 *
 * Anything unrecognised degrades to the nearest real thing rather than a dead
 * end: /menu/decaf becomes the menu chooser, and a path that matches nothing
 * becomes home. Callers compare the result against pathFor() and correct the
 * address bar, so it never claims to be somewhere the app isn't.
 */
export function routeFor(pathname: string): Route {
  const path = normalise(pathname);

  const exact = BY_PATH.get(path);
  if (exact) return { page: exact, menuCategory: null, objectId: null };

  if (path.startsWith(`${ROUTES.menu}/`)) {
    const slug = path.slice(ROUTES.menu.length + 1);
    const category = (CATEGORIES.find((c) => c === slug) ?? null) as MenuCategory;
    return { page: "menu", menuCategory: category, objectId: null };
  }

  /* The id is not checked against the catalogue here — the shelf is loaded
     from Supabase and this function is pure and synchronous. An id that
     matches nothing renders the shelf instead; see ObjectDetail. */
  if (path.startsWith(`${ROUTES.objects}/`)) {
    const slug = path.slice(ROUTES.objects.length + 1);
    return slug
      ? { page: "object", menuCategory: null, objectId: slug }
      : { page: "objects", menuCategory: null, objectId: null };
  }

  return { page: "home", menuCategory: null, objectId: null };
}
