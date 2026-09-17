import { forwardRef, useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import {
  register,
  resendConfirmation,
  signIn,
  signOut,
  requestPasswordReset,
  updatePassword,
  loadProfile,
  saveProfile,
} from "@/lib/api/auth";
import { messageFor, type AppError } from "@/lib/api/errors";
import { ORDERING_OPEN } from "@/lib/constants";
import { useDialogFocus } from "@/app/hooks/useDialogFocus";

/*
 * The account, as one panel with six states rather than six pages.
 *
 *   signin    email + password
 *   register  name + email + password
 *   sent      registered, waiting on the confirmation email — with a way to
 *             send it again
 *   forgot    email, sends a reset link
 *   recover   set a new password — only reachable from an emailed link
 *   account   signed in: name, mobile, sign out
 *
 * `sent` is the state that closes the loop. Before it, registering left the
 * visitor on the sign-up form with a line of grey text under it, still looking
 * at the fields they had just filled in and with no way to ask for the email
 * again if it never arrived. A sign-up that ends on the form it started on does
 * not read as having worked.
 *
 * `recover` is the one that is easy to leave out and then ship broken. A reset
 * link returns to the site carrying a recovery token; supabaseClient's
 * detectSessionInUrl turns that into a session, App raises `recovering`, and
 * this opens straight into the new-password form. Without that path the link
 * silently signs the visitor in and shows them a profile form, which is not
 * what they clicked.
 */

type Mode = "signin" | "register" | "sent" | "forgot" | "recover" | "account";

type Props = {
  session: Session | null;
  /** True when the page was opened from a password-recovery link. */
  recovering: boolean;
  onClose: () => void;
  navHeight: string;
  id?: string;
};

export function AccountPanel({ session, recovering, onClose, navHeight, id }: Props) {
  const [mode, setMode] = useState<Mode>(() =>
    recovering ? "recover" : session ? "account" : "signin",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const firstFieldRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  /* Follow the session: signing in or out moves the panel without the caller
     having to drive it. Recovery wins, because that is why the page opened. */
  useEffect(() => {
    if (recovering) setMode("recover");
    else if (session) setMode((m) => (m === "recover" ? m : "account"));
    else setMode((m) => (m === "register" || m === "forgot" || m === "sent" ? m : "signin"));
  }, [session, recovering]);

  /*
   * Trap and Escape first, THEN the field. Order matters: useDialogFocus puts
   * the cursor on the panel's first focusable element, which is the close
   * button, so declaring it after this effect would mean every change of state
   * ends with focus on "close" rather than on the field that state is about.
   * Effects run in declaration order, so the later one has the last word.
   */
  useDialogFocus(true, dialogRef, onClose);

  /* Never carry a typed password across a change of state — not into the
     confirmation screen, not back to the sign-in form. */
  useEffect(() => {
    setShowPassword(false);
    firstFieldRef.current?.focus();
  }, [mode]);

  /* Load the profile once signed in, so the fields show what is stored rather
     than blank boxes that look unsaved. */
  useEffect(() => {
    if (!session?.user || mode !== "account") return;
    let live = true;
    loadProfile(session.user).then((p) => {
      if (!live || !p) return;
      setFullName(p.full_name);
      setPhone(p.phone ?? "");
    });
    return () => {
      live = false;
    };
  }, [session, mode]);

  const fail = (e: AppError) => setError(messageFor(e));

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  }

  /* One way between states, so nothing is left over from the last one. */
  const goTo = (next: Mode) => {
    setError("");
    setNotice("");
    setPassword("");
    setMode(next);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (mode === "signin") {
      run(async () => {
        const r = await signIn(email, password);
        if (!r.ok) fail(r.error);
        else setPassword("");
      });
    } else if (mode === "register") {
      run(async () => {
        const r = await register(email, password, fullName);
        if (!r.ok) return fail(r.error);
        setPassword("");
        /* No session back means the address has to be confirmed first. With a
           session, the effect above has already moved this to `account`. */
        if (r.value.needsConfirmation) setMode("sent");
      });
    } else if (mode === "forgot") {
      run(async () => {
        const r = await requestPasswordReset(email);
        if (!r.ok) return fail(r.error);
        /* Same message whether or not an account exists — see auth.ts. */
        setNotice("If that email has an account, a reset link is on its way. It works once, and expires within the hour.");
      });
    } else if (mode === "recover") {
      run(async () => {
        const r = await updatePassword(password);
        if (!r.ok) return fail(r.error);
        setPassword("");
        setNotice("Password updated.");
        setMode("account");
      });
    } else if (mode === "account" && session) {
      run(async () => {
        const r = await saveProfile(session.user.id, { full_name: fullName, phone });
        if (!r.ok) return fail(r.error);
        setNotice("Saved.");
      });
    }
  };

  const showsEmail = mode === "signin" || mode === "register" || mode === "forgot";
  const showsPassword = mode === "signin" || mode === "register" || mode === "recover";

  return (
    <div
      id={id}
      ref={dialogRef}
      className="editorial-account-panel"
      style={{ top: navHeight }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mantel-account-title"
      tabIndex={-1}
    >
      <div className="editorial-account-inner">
        <header className="editorial-account-head">
          <div>
            <p className="editorial-overline">Mantel account</p>
            <h2 id="mantel-account-title">{TITLES[mode]}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account"
            className="editorial-account-close"
          >
            <X size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </header>

        {/*
          * Answers the question the old panel left hanging: two boxes and a
          * button, with nothing anywhere saying what happens to what is typed
          * into them. One sentence per state, and true of what the code does.
          */}
        <p className="editorial-account-blurb">{BLURBS[mode]}</p>

        {mode === "sent" ? (
          <div className="editorial-account-sent">
            <p className="editorial-account-sent-address">{email}</p>
            <p>
              Open the link in that email to finish setting up the account. It can take a minute,
              and it does sometimes land in spam.
            </p>
            <button
              type="button"
              className="editorial-account-secondary"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const r = await resendConfirmation(email);
                  if (!r.ok) return fail(r.error);
                  setNotice("Sent again. Give it a minute before asking for another.");
                })
              }
            >
              {busy ? "…" : "Send it again"}
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="editorial-account-form">
            {mode === "register" && (
              <Field
                ref={firstFieldRef}
                label="Name"
                value={fullName}
                onChange={setFullName}
                autoComplete="name"
                required
              />
            )}

            {showsEmail && (
              <Field
                ref={mode === "register" ? undefined : firstFieldRef}
                label="Email"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
                required
              />
            )}

            {showsPassword && (
              <Field
                ref={mode === "recover" ? firstFieldRef : undefined}
                label={mode === "recover" ? "New password" : "Password"}
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={setPassword}
                /* Tells a password manager to offer a new password on the ways
                   in and the stored one on the way back. */
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={6}
                required
                /* The project's real rule, verified against its own endpoint:
                   6 characters minimum AND at least one capital, one small
                   letter and one number. Saying so here costs a line; leaving
                   it to the server costs the visitor a rejected attempt. */
                hint={
                  mode === "signin"
                    ? undefined
                    : "At least 6 characters, with a capital, a small letter and a number."
                }
                action={{
                  label: showPassword ? "Hide" : "Show",
                  onClick: () => setShowPassword((v) => !v),
                }}
              />
            )}

            {mode === "account" && (
              <>
                <p className="editorial-account-signed-in">
                  Signed in as <strong>{session?.user.email}</strong>
                </p>
                <Field
                  ref={firstFieldRef}
                  label="Name"
                  value={fullName}
                  onChange={setFullName}
                  autoComplete="name"
                />
                <Field
                  label="Mobile"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  autoComplete="tel"
                  placeholder="+973 3600 0000"
                  hint="Only used if we need to reach you about an order."
                />
                {/* Honest about what an account is worth today rather than
                    implying a history that cannot exist yet. */}
                <p className="editorial-account-hint">
                  {ORDERING_OPEN
                    ? "Your details fill in at checkout, and your orders appear here."
                    : "Saved for checkout. Your orders will appear here once ordering opens."}
                </p>
              </>
            )}

            <button type="submit" disabled={busy} className="editorial-account-primary">
              {busy ? "…" : ACTIONS[mode]}
            </button>
          </form>
        )}

        {error && (
          <p className="editorial-account-error" role="alert">{error}</p>
        )}
        {notice && (
          <p className="editorial-account-notice" role="status">{notice}</p>
        )}

        {/*
          * The ways between states. Each one is a real, underlined control that
          * reads as something to press — they used to be 11px grey capitals
          * indistinguishable from the panel's own captions, which is why
          * "Create an account" looked like a label rather than the way in.
          */}
        <div className="editorial-account-switches">
          {mode === "signin" && (
            <>
              <Switch onClick={() => goTo("register")}>Create an account</Switch>
              <Switch onClick={() => goTo("forgot")}>Forgot your password?</Switch>
            </>
          )}
          {(mode === "register" || mode === "forgot" || mode === "sent") && (
            <Switch onClick={() => goTo("signin")}>← Back to sign in</Switch>
          )}
          {mode === "forgot" && (
            <Switch onClick={() => goTo("register")}>Create an account</Switch>
          )}
          {mode === "account" && (
            <Switch
              onClick={() =>
                run(async () => {
                  const r = await signOut();
                  if (!r.ok) fail(r.error);
                })
              }
            >
              Sign out
            </Switch>
          )}
        </div>
      </div>
    </div>
  );
}

const TITLES: Record<Mode, string> = {
  signin: "Sign in",
  register: "Create an account",
  sent: "Check your inbox",
  forgot: "Reset your password",
  recover: "Choose a new password",
  account: "Your account",
};

const ACTIONS: Record<Mode, string> = {
  signin: "Sign in",
  register: "Create account",
  sent: "Send it again",
  forgot: "Send reset link",
  recover: "Save password",
  account: "Save changes",
};

/* One sentence per state, saying where what is typed actually goes. Written for
   a customer, so it says what happens rather than which vendor it happens at. */
const BLURBS: Record<Mode, string> = {
  signin:
    "Your email and password go to Mantel's account system to be checked. The password is never stored on this site and is never visible to anyone at the counter.",
  register:
    "Your name and email are kept with Mantel so the counter knows whose order is whose. The password is stored scrambled — nobody here, staff included, can read it back.",
  sent: "We've sent a confirmation link to:",
  forgot:
    "Enter the address on the account and we'll email a link for setting a new password. Nothing changes until you use it.",
  recover:
    "You're here from the emailed link, so this is the last step. Choose a password and you'll be signed in.",
  account:
    "A name and a mobile, kept so they aren't retyped at every checkout. Nothing else is stored, and ordering never requires an account.",
};

function Switch({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="editorial-account-switch">
      {children}
    </button>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  /** Quiet line under the input, for a rule the visitor would otherwise hit. */
  hint?: string;
  /** An inline control on the label row — the password show/hide toggle. */
  action?: { label: string; onClick: () => void };
};

/*
 * Ruled underline, no box — the same treatment as the cart's checkout field.
 *
 * forwardRef, and that is the whole point of this comment. This was a plain
 * function component reading `ref` out of its props, which React 18 does not
 * pass: the ref stayed null, React logged "Function components cannot be given
 * refs", and the effect above that focuses the first field on every change of
 * state silently did nothing. Opening the panel put the cursor nowhere.
 */
const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, value, onChange, type = "text", hint, action, ...rest },
  ref,
) {
  /* htmlFor rather than a wrapping <label>, because the show/hide toggle sits
     on the label's row: a <button> inside a <label> is activated by the label
     as well as by itself, so the two fight over one click. */
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className="editorial-account-field">
      <div className="editorial-account-field-row">
        <label className="editorial-account-field-label" htmlFor={id}>{label}</label>
        {action && (
          <button type="button" onClick={action.onClick} className="editorial-account-field-action">
            {action.label}
          </button>
        )}
      </div>
      <input
        id={id}
        ref={ref}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? hintId : undefined}
        {...rest}
      />
      {hint && <p className="editorial-account-field-hint" id={hintId}>{hint}</p>}
    </div>
  );
});
