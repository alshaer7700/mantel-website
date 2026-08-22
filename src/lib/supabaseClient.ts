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
// The site uses no Supabase Auth, so the client shouldn't persist sessions,
// refresh tokens, or parse auth tokens out of the page URL — each of those is
// attack surface (and localStorage writes) for a feature that doesn't exist.
// Staff accounts (roadmap Phase 3) need the opposite settings, and two GoTrue
// clients on one origin collide unless they carry different storage keys — so
// that arrives as a SECOND client here, not as a change to this one.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
