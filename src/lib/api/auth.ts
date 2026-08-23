import { supabase } from "@/lib/supabaseClient";
import { settle } from "@/lib/api/settle";
import { toAppError, type AppError } from "@/lib/api/errors";
import type { Session, User, AuthError } from "@supabase/supabase-js";

/*
 * Accounts: register, sign in, sign out, reset a password, and the profile
 * row behind them.
 *
 * WHAT AN ACCOUNT IS FOR HERE. Not much, yet, and that is worth being honest
 * about in the UI rather than papering over: ordering is locked, so there is
 * no history to show. What it does today is hold a name and mobile so they are
 * not retyped at every checkout, and it becomes an order history the moment
 * ordering opens — orders already carry user_id (010).
 *
 * Guest checkout is never removed. The roadmap's line is "never force signup
 * for a coffee", and orders.user_id is nullable precisely so that holds.
 */

export type Profile = { id: string; full_name: string; phone: string | null };

export type AuthResult<T = void> = { ok: true; value: T } | { ok: false; error: AppError };

/*
 * Supabase's AuthError is not a PostgrestError — different shape, different
 * codes — so it is translated here rather than pushed through toAppError,
 * which reads SQLSTATEs. The messages GoTrue returns are written for
 * developers ("Invalid login credentials"), and several leak whether an
 * address is registered, so they are mapped rather than shown.
 */
function fromAuthError(error: AuthError): AppError {
  const raw = error.message.toLowerCase();

  if (raw.includes("invalid login credentials")) {
    /* Deliberately does not say WHICH is wrong. "No account with that email"
       turns the sign-in form into a tool for discovering who has one. */
    return { kind: "notice", message: "That email and password don't match." };
  }
  if (raw.includes("email not confirmed")) {
    return { kind: "notice", message: "Check your inbox and confirm your email first." };
  }
  if (raw.includes("already registered") || raw.includes("already been registered")) {
    return { kind: "notice", message: "There's already an account with that email." };
  }
  if (raw.includes("signups not allowed") || raw.includes("signup is disabled")) {
    /*
     * The expected result until public signup is enabled on the project
     * (audit M-6, disabled deliberately and verified 2026-07-10).
     *
     * NOT `forbidden`. That kind already means "ordering is locked", and
     * messageFor renders it as "Ordering opens soon — the menu is here to
     * browse in the meantime" — which, shown to someone who just tried to
     * register, is an answer to a question they did not ask. Two different
     * doors, two different sentences.
     */
    return { kind: "notice", message: "Accounts aren't open yet — ordering and sign-up arrive together." };
  }
  if (raw.includes("password") && raw.includes("6")) {
    return { kind: "notice", message: "Use at least 6 characters for the password." };
  }
  if (raw.includes("rate limit") || raw.includes("too many")) {
    return { kind: "rate-limited", message: "Too many attempts — try again in a few minutes." };
  }
  if (raw.includes("fetch") || raw.includes("network")) {
    return { kind: "network" };
  }
  return { kind: "notice", message: "Something went wrong. Please try again." };
}

// ── session ────────────────────────────────────────────────────────────────

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Fires on sign-in, sign-out, token refresh and password recovery. */
export function onAuthChange(fn: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => fn(session));
  return () => data.subscription.unsubscribe();
}

// ── register / sign in / sign out ──────────────────────────────────────────

export async function register(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResult<{ needsConfirmation: boolean }>> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      /* Stored on the auth user so the name survives even if the profile row
         write fails — the profile can be rebuilt from it later. */
      data: { full_name: fullName.trim().slice(0, 120) },
      emailRedirectTo: `${window.location.origin}/`,
    },
  });

  if (error) return { ok: false, error: fromAuthError(error) };

  /*
   * With email confirmation on, signUp returns a user but NO session — the
   * account is not usable until the link is clicked. Treating that as "signed
   * in" is how a confirmation flow ends up silently broken, so it is reported
   * as its own state instead.
   */
  const needsConfirmation = data.session === null;

  if (data.session && data.user) await ensureProfile(data.user, fullName);

  return { ok: true, value: { needsConfirmation } };
}

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) return { ok: false, error: fromAuthError(error) };
  return { ok: true, value: undefined };
}

export async function signOut(): Promise<AuthResult> {
  const { error } = await supabase.auth.signOut();
  if (error) return { ok: false, error: fromAuthError(error) };
  return { ok: true, value: undefined };
}

// ── password reset ─────────────────────────────────────────────────────────

/**
 * Step one: send the email.
 *
 * Always reports success, even for an address with no account. Reporting
 * "no such account" here would turn this form into an account-existence
 * oracle — the same reasoning as the sign-in message above.
 */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/`,
  });
  if (error && !error.message.toLowerCase().includes("not found")) {
    return { ok: false, error: fromAuthError(error) };
  }
  return { ok: true, value: undefined };
}

/**
 * Step two: set the new password.
 *
 * Only works while the recovery session from the emailed link is active —
 * which is what detectSessionInUrl in supabaseClient exists to establish.
 */
export async function updatePassword(password: string): Promise<AuthResult> {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { ok: false, error: fromAuthError(error) };
  return { ok: true, value: undefined };
}

// ── profile ────────────────────────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await settle(
    supabase.from("profiles").select("id, full_name, phone").eq("id", userId).maybeSingle(),
  );
  if (error || !data) return null;
  return data;
}

export async function saveProfile(
  userId: string,
  fields: { full_name: string; phone: string | null },
): Promise<AuthResult> {
  const { error } = await settle(
    supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fields.full_name.trim().slice(0, 120),
        phone: fields.phone?.trim() || null,
      },
      { onConflict: "id" },
    ),
  );
  if (error) return { ok: false, error: toAppError(error) };
  return { ok: true, value: undefined };
}

/*
 * Creates the profile row on first sign-up.
 *
 * Deliberately NOT a database trigger on auth.users, which is the other common
 * pattern: a trigger there runs as the auth admin and fails invisibly, and
 * debugging it means reading Supabase's own logs. Doing it from the client
 * means a failure is visible, and RLS still guarantees the row can only be the
 * caller's own.
 */
async function ensureProfile(user: User, fullName: string): Promise<void> {
  await saveProfile(user.id, { full_name: fullName, phone: null });
}
