/**
 * Cash-on-pickup ordering is live. The matching Supabase migration grants access
 * only to the server-priced place_order RPC and locks orders to payment_method
 * = 'cash'. Do not add card checkout until a real payment gateway is integrated.
 */
export const ORDERING_OPEN = true;
