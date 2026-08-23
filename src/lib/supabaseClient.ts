import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local");
}

// Generic over the generated Database type, so every query in src/lib/api is
// checked against the real columns rather than against a hand-written
// interface that could silently drift from them.
//
// THE AUTH SETTINGS WERE ALL FALSE UNTIL 010, AND THAT WAS CORRECT AT THE TIME.
// The comment they replaced read: "The site uses no Supabase Auth, so the
// client shouldn't persist sessions, refresh tokens, or parse auth tokens out
// of the page URL — each of those is attack surface (and localStorage writes)
// for a feature that doesn't exist."
//
// The feature now exists, so each has to be reconsidered on its own terms
// rather than flipped as a group:
//
//   persistSession      REQUIRED. Without it a customer is signed out by a
//                       refresh, which is not an account.
//   autoRefreshToken    REQUIRED. Access tokens are short-lived; without a
//                       refresh the session dies mid-visit for no visible
//                       reason.
//   detectSessionInUrl  REQUIRED, and the least obvious. Password-reset and
//                       email-confirmation links come back carrying tokens in
//                       the URL fragment. With this false, the link appears to
//                       do nothing — the single most common way a reset flow
//                       is shipped broken.
//
// Storage is localStorage, GoTrue's default, NOT cookies. That is deliberate:
// the site's privacy position is that it sets no cookies and needs no consent
// banner, and this keeps it true. The trade-off written down: a token in
// localStorage is readable by any script that runs on the page, where an
// httpOnly cookie would not be. Acceptable here because the CSP is
// script-src 'self' with no unsafe-inline or unsafe-eval, React escapes
// everything, and there is no dangerouslySetInnerHTML in the tree. If any of
// those three changes, revisit this.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storageKey: "mantel-auth",
  },
});
