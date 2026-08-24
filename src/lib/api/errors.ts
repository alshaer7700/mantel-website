/*
 * One place that knows how to read a Postgres failure.
 *
 * The database is deliberate about how it fails — 005 raises SQLSTATE PT429 so
 * PostgREST answers 429 rather than a generic 400, precisely so a caller can
 * tell "slow down" apart from "your order is malformed". Nothing in the app
 * read that distinction, because nothing in the app called the RPC at all.
 * This module is where that intent lands on the client.
 *
 * Everything above this layer switches on `kind` and never sees a raw error.
 */

export type AppError =
  /** PT429 from 005: per-email, per-IP or global window exceeded. */
  | { kind: "rate-limited"; message: string }
  /** 42501 insufficient_privilege or another protected backend action. */
  | { kind: "forbidden" }
  /** An item was delisted between loading the menu and submitting the order. */
  | { kind: "unavailable"; message: string }
  /** Never reached the database — offline, DNS, CORS, blocked request. */
  | { kind: "network" }
  /**
   * A sentence already written FOR the customer, shown verbatim.
   *
   * This exists because `unknown` deliberately throws its message away:
   * toAppError puts raw Postgres text there, which names internal states and
   * must never reach a visitor. That was right for the database and wrong for
   * auth — src/lib/api/auth.ts hand-writes every message it returns ("That
   * email and password don't match"), and those were being replaced by the
   * generic apology, which is how a login form ends up unable to tell you your
   * password is wrong.
   *
   * The rule: `notice` is for prose a human wrote for a visitor. `unknown` is
   * for anything a machine produced.
   */
  | { kind: "notice"; message: string }
  | { kind: "unknown"; message: string };

/** What the visitor is shown. Deliberately free of jargon and error codes. */
export function messageFor(error: AppError): string {
  switch (error.kind) {
    case "rate-limited":
      return error.message;
    case "forbidden":
      return "This action is not available right now. Please try again in a moment.";
    case "unavailable":
      return "Something in your bag just sold out. Take it out and try again.";
    case "network":
      return "Couldn't reach us just now. Check your connection and try again.";
    case "notice":
      return error.message;
    case "unknown":
      return "Something went wrong on our end. Please try again in a moment.";
  }
}

/*
 * PostgREST reports the raise site's SQLSTATE in `code`, so the classification
 * keys off that rather than off message text — 005's three limits all raise
 * PT429 but with three different sentences, and matching on prose would break
 * the moment one is reworded.
 *
 * The messages from those three raises are written for customers ("too many
 * orders from this device — please try again in a few minutes") and are shown
 * as-is. The item-validation raise is not: it names internal states, so it is
 * translated rather than surfaced.
 */

/*
 * Structural, not PostgrestError. This reads exactly two fields, and
 * PostgrestError is a class in supabase-js — so requiring the real type would
 * force src/lib/api/settle.ts to fabricate a class instance (toJSON and all)
 * just to describe a dead socket. The narrow shape says what is actually used.
 */
export type QueryError = { code?: string | null; message?: string | null };

export function toAppError(error: QueryError | null): AppError {
  if (!error) return { kind: "unknown", message: "No error supplied." };

  if (error.code === "PT429") {
    /* 005 always attaches a customer-facing sentence to this code, but the
       fallback keeps the type honest rather than trusting that forever. */
    return {
      kind: "rate-limited",
      message: error.message ?? "Too many orders just now — please try again in a few minutes.",
    };
  }

  if (error.code === "42501") {
    return { kind: "forbidden" };
  }

  // Raised without an explicit errcode, so it arrives as the generic
  // raise_exception P0001 and has to be recognised by what it says.
  if (error.message?.includes("unknown, unavailable, or invalid-quantity")) {
    return { kind: "unavailable", message: error.message };
  }

  /*
   * supabase-js surfaces a failed fetch as a PostgrestError-shaped object with
   * an empty code, since there was no HTTP response to read one from.
   */
  if (!error.code) return { kind: "network" };

  return { kind: "unknown", message: error.message ?? "Unknown error." };
}
