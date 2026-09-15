/**
 * Cash-on-pickup ordering is live. The matching Supabase migration grants access
 * only to the server-priced place_order RPC and locks orders to payment_method
 * = 'cash'. Do not add card checkout until a real payment gateway is integrated.
 */
export const ORDERING_OPEN = true;

/**
 * Whether Order Before Reach takes orders yet.
 *
 * Separate from ORDERING_OPEN on purpose: the cart, the checkout and the
 * place_order RPC all stay live, because Retail still sells through them. This
 * flag governs one page — the café menu with add-to-cart — and the one link on
 * the Menu page that points at it. Set it true and the page comes back exactly
 * as it was; nothing else needs touching.
 */
export const PICKUP_OPEN = false;

/**
 * Where "Find us" goes: the shop on Google Maps, in a new tab.
 *
 * A `?api=1&query=` search URL rather than a coordinate or a /maps/place/…
 * link, deliberately. The search form is the one Google documents as stable,
 * it opens the native Maps app on iOS and Android instead of the browser, and
 * it degrades to a sensible result list rather than a dead pin if the listing
 * is ever moved or renamed.
 *
 * Replace the whole string with the listing's own share link once the Mantel
 * pin is claimed — that is the only edit needed, since every "Find us" on the
 * site reads this constant.
 */
export const MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=Mantel%20Coffee%2C%20Hidd%2C%20Muharraq%2C%20Bahrain";
