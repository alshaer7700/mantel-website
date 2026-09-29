import { supabase as client } from "@/lib/supabaseClient";

/*
 * The staff dashboard's door into Supabase.
 *
 * CI only lets src/lib/api/* import the client (see .github/workflows/ci.yml),
 * so the dashboard in src/admin reaches it through here rather than importing
 * supabaseClient itself. It is the same client and the same session as the
 * public site — signing in on either signs in on both — and row-level security
 * in Postgres, not this file, decides what a signed-in person may read or change.
 */
export const supabase = client;
