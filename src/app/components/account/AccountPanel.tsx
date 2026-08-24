import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import {
  register,
  signIn,
  signOut,
  requestPasswordReset,
  updatePassword,
  fetchProfile,
  saveProfile,
} from "@/lib/api/auth";
import { messageFor, type AppError } from "@/lib/api/errors";
import { LABEL, LABEL_INK } from "@/app/components/type";
import { ORDERING_OPEN } from "@/lib/constants";

/*
 * The account, as one panel with five states rather than five pages.
 *
 *   signin    email + password
 *   register  name + email + password
 *   forgot    email, sends a reset link
 *   recover   set a new password — only reachable from an emailed link
 *   account   signed in: name, mobile, sign out
 *
 * `recover` is the one that is easy to leave out and then ship broken. A reset
 * link returns to the site carrying a recovery token; supabaseClient's
 * detectSessionInUrl turns that into a session, App raises `recovering`, and
 * this opens straight into the new-password form. Without that path the link
 * silently signs the user in and shows them a profile form, which is not what
 * they clicked.
 */

type Mode = "signin" | "register" | "forgot" | "recover" | "account";

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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  /* Follow the session: signing in or out moves the panel without the caller
     having to drive it. Recovery wins, because that is why the page opened. */
  useEffect(() => {
    if (recovering) setMode("recover");
    else if (session) setMode((m) => (m === "recover" ? m : "account"));
    else setMode((m) => (m === "register" || m === "forgot" ? m : "signin"));
  }, [session, recovering]);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, [mode]);

  /* Load the profile once signed in, so the fields show what is stored rather
     than blank boxes that look unsaved. */
  useEffect(() => {
    if (!session?.user || mode !== "account") return;
    let live = true;
    fetchProfile(session.user.id).then((p) => {
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
        if (r.value.needsConfirmation) {
          setNotice("Check your inbox — confirm your email to finish setting up the account.");
        }
      });
    } else if (mode === "forgot") {
      run(async () => {
        const r = await requestPasswordReset(email);
        if (!r.ok) return fail(r.error);
        /* Same message whether or not an account exists — see auth.ts. */
        setNotice("If that email has an account, a reset link is on its way.");
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

  return (
    <div
      id={id}
      className="fixed inset-x-0 z-50 bg-[color:var(--bg)] border-b border-[color:var(--line)]"
      style={{ top: navHeight }}
      role="dialog"
      aria-label="Account"
    >
      <div className="px-[var(--pad)] py-[var(--s-3)] max-h-[70vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-[var(--s-2)] mb-[var(--s-3)]">
          <p className={LABEL}>{TITLES[mode]}</p>
          <button
            onClick={onClose}
            aria-label="Close account"
            className="shrink-0 text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition-colors border border-[color:var(--line)] p-1"
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={submit} className="max-w-[420px] flex flex-col gap-[var(--s-2)]">
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

          {(mode === "signin" || mode === "register" || mode === "forgot") && (
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

          {(mode === "signin" || mode === "register" || mode === "recover") && (
            <Field
              ref={mode === "recover" ? firstFieldRef : undefined}
              label={mode === "recover" ? "New password" : "Password"}
              type="password"
              value={password}
              onChange={setPassword}
              /* Tells a password manager to offer a new password on the ways in
                 and the stored one on the way back. */
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={6}
              required
            />
          )}

          {mode === "account" && (
            <>
              <p className="font-mono text-[13px] text-[color:var(--ink-muted)]">
                Signed in as {session?.user.email}
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
              />
              {/* Honest about what an account is worth today rather than
                  implying a history that cannot exist yet. */}
              <p className="font-mono text-[11px] leading-[1.6] text-[color:var(--ink-muted)]">
                {ORDERING_OPEN
                  ? "Your details fill in at checkout, and your orders appear here."
                  : "Saved for checkout. Your orders will appear here once ordering opens."}
              </p>
            </>
          )}

          {error && (
            <p className="font-mono text-[12px] leading-[1.5] text-[color:var(--brand)]" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="font-mono text-[12px] leading-[1.5] text-[color:var(--ink)]" role="status">
              {notice}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-[var(--s-1)] font-mono text-[11px] tracking-[0.2em] uppercase border border-[color:var(--ink)] px-[var(--s-3)] py-[10px] text-[color:var(--ink)] hover:bg-[color:var(--ink)] hover:text-[color:var(--bg)] transition-colors disabled:opacity-40 disabled:pointer-events-none self-start"
          >
            {busy ? "…" : ACTIONS[mode]}
          </button>
        </form>

        {/* The ways between states. Kept as plain ruled links: none of them is
            the primary action on the panel they appear in. */}
        <div className="flex flex-wrap gap-[var(--s-3)] mt-[var(--s-3)]">
          {mode === "signin" && (
            <>
              <Switch onClick={() => setMode("register")}>Create an account</Switch>
              <Switch onClick={() => setMode("forgot")}>Forgot password</Switch>
            </>
          )}
          {(mode === "register" || mode === "forgot") && (
            <Switch onClick={() => setMode("signin")}>← Sign in instead</Switch>
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
  forgot: "Reset your password",
  recover: "Choose a new password",
  account: "Your account",
};

const ACTIONS: Record<Mode, string> = {
  signin: "Sign in",
  register: "Create account",
  forgot: "Send reset link",
  recover: "Save password",
  account: "Save",
};

function Switch({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={LABEL_INK}>
      {children}
    </button>
  );
}

/* Ruled underline, no box — the same treatment the checkout fields will use. */
const Field = (() => {
  type FieldProps = {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    autoComplete?: string;
    placeholder?: string;
    required?: boolean;
    minLength?: number;
  };
  return function FieldImpl({
    ref,
    label,
    value,
    onChange,
    type = "text",
    ...rest
  }: FieldProps & { ref?: React.Ref<HTMLInputElement> }) {
    return (
      <label className="flex flex-col gap-[6px]">
        <span className={LABEL}>{label}</span>
        <input
          ref={ref}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-[14px] text-[color:var(--ink)] bg-transparent border-0 border-b border-[color:var(--line)] py-[8px] rounded-none outline-none focus:border-[color:var(--ink)] transition-colors placeholder:text-[color:var(--ink-muted)]"
          {...rest}
        />
      </label>
    );
  };
})();
