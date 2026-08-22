// FormSubmit relay — delivers contact-form, order-notification, and
// newsletter-signup emails to the owner's inbox. The path segment is
// FormSubmit's random alias for the owner's address (from the activation
// email), so the address itself never ships in the JS bundle.
export const CONTACT_ENDPOINT = "https://formsubmit.co/ajax/75e78afd9ab491476cf4dc85e913f77d";

/*
 * Whether the bag and checkout accept orders.
 *
 * This mirrors a GRANT in the database and is not itself a control. EXECUTE on
 * place_order is revoked from anon (supabase/004, re-asserted in 005 and 009),
 * so an order submitted with this flag flipped by hand in devtools still fails
 * with 42501 — which src/lib/api/errors.ts maps to "ordering opens soon".
 *
 * Its only job is to stop the UI offering something that cannot work. Flip it
 * to true in the same change that runs the grant line at the foot of
 * supabase/009_objects_and_pickup.sql, and not before: the roadmap gates that
 * grant on Turnstile plus the flood test (H-1).
 */
export const ORDERING_OPEN = false;
