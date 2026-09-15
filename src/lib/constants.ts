/**
 * Cash-on-pickup ordering is live. The matching Supabase migration grants access
 * only to the server-priced place_order RPC and locks orders to payment_method
 * = 'cash'. Do not add card checkout until a real payment gateway is integrated.
 */
export const ORDERING_OPEN = true;

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
