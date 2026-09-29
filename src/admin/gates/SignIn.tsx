import { useState } from "react";
import { Eye, EyeOff, Languages } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useT, type Lang } from "@/admin/i18n";
import { Button, EMAIL_RE, TextField } from "@/admin/ui/controls";
import { Notice } from "@/admin/ui/layout";

function Brand() {
  const t = useT();
  return (
    <div className="adm-brand">
      <strong>Mantel.</strong>
      <span>{t("Staff")}</span>
    </div>
  );
}

export function SignInGate({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  const t = useT();
  const [mode, setMode] = useState<"signin" | "forgot" | "sent">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!EMAIL_RE.test(email.trim())) {
      setError(t("Enter the email address you use for Mantel."));
      return;
    }
    setBusy(true);
    if (mode === "forgot") {
      await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/admin` });
      setBusy(false);
      setMode("sent");
      return;
    }
    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (authError) {
      const msg = authError.message.toLowerCase();
      setError(
        msg.includes("confirm")
          ? t("This email hasn't been confirmed yet. Open the link we emailed you first.")
          : msg.includes("invalid") || msg.includes("credentials")
            ? t("That email and password don't match. Check them, or reset the password.")
            : msg.includes("rate") || msg.includes("too many")
              ? t("Too many attempts. Wait a minute and try again.")
              : t("Couldn't sign in right now. Check the connection and try again."),
      );
    }
  };

  return (
    <div className="adm-gate">
      <form className="adm-gate-card" onSubmit={submit} noValidate>
        <Brand />
        <h1 className="adm-gate-title">{mode === "signin" ? t("Sign in to the dashboard") : t("Reset your password")}</h1>
        {mode === "sent" ? (
          <>
            <Notice tone="ok" title={t("Check your email")}>
              {t("If {email} belongs to a Mantel account, a link to set a new password is on its way. It can take a minute, and sometimes lands in spam.", { email: email.trim() })}
            </Notice>
            <Button onClick={() => setMode("signin")}>{t("Back to sign in")}</Button>
          </>
        ) : (
          <>
            <p className="adm-gate-sub">
              {mode === "signin" ? t("For the Mantel team only.") : t("Enter your email and we'll send you a link to choose a new password.")}
            </p>
            <TextField label={t("Email")} type="email" autoComplete="username" value={email} onChange={setEmail} inputMode="email" dir="ltr" />
            {mode === "signin" && (
              <div className="adm-field">
                <label className="adm-label" htmlFor="adm-password">{t("Password")}</label>
                <div className="adm-input-affix" dir="ltr">
                  <input
                    id="adm-password"
                    className="adm-input"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" className="adm-icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? t("Hide password") : t("Show password")} style={{ height: "auto" }}>
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}
            {error && <p className="adm-error" role="alert">{error}</p>}
            <Button type="submit" variant="primary" size="lg" loading={busy} block>
              {mode === "signin" ? t("Sign in") : t("Send reset link")}
            </Button>
            <div className="adm-gate-foot">
              <Button variant="ghost" size="sm" onClick={() => { setMode(mode === "signin" ? "forgot" : "signin"); setError(""); }}>
                {mode === "signin" ? t("Forgot password?") : t("Back to sign in")}
              </Button>
            </div>
          </>
        )}
        <div className="adm-gate-foot">
          <Button variant="ghost" size="sm" icon={<Languages size={16} />} onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
            {lang === "ar" ? "English" : "العربية"}
          </Button>
          <a className="adm-btn adm-btn-ghost adm-btn-sm" href="/">{t("Back to the website")}</a>
        </div>
      </form>
    </div>
  );
}

export function NotStaffGate({ email, error, onRetry }: { email: string; error: string; onRetry: () => void }) {
  const t = useT();
  return (
    <div className="adm-gate">
      <div className="adm-gate-card">
        <Brand />
        <h1 className="adm-gate-title">{t("This account isn't on the team")}</h1>
        {error ? (
          <Notice tone="danger" title={t("Couldn't check your access")}>{error}</Notice>
        ) : (
          <p className="adm-gate-sub">
            {t("{email} is signed in, but it hasn't been added to the Mantel team. Ask an admin to invite this email under Team.", { email })}
          </p>
        )}
        <Button onClick={onRetry}>{t("Check again")}</Button>
        <Button variant="ghost" onClick={() => void supabase.auth.signOut()}>{t("Sign in with a different account")}</Button>
        <a className="adm-btn adm-btn-ghost" href="/">{t("Back to the website")}</a>
      </div>
    </div>
  );
}

export function RecoveryGate({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError(t("Use at least 8 characters."));
      return;
    }
    if (password !== confirm) {
      setError(t("The two passwords don't match."));
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(t("Couldn't save the new password. Open the link from the email again."));
      return;
    }
    window.history.replaceState({}, "", "/admin");
    onDone();
  };

  return (
    <div className="adm-gate">
      <form className="adm-gate-card" onSubmit={submit}>
        <Brand />
        <h1 className="adm-gate-title">{t("Choose a new password")}</h1>
        <TextField label={t("New password")} type="password" autoComplete="new-password" value={password} onChange={setPassword} hint={t("At least 8 characters.")} dir="ltr" />
        <TextField label={t("Type it again")} type="password" autoComplete="new-password" value={confirm} onChange={setConfirm} dir="ltr" />
        {error && <p className="adm-error" role="alert">{error}</p>}
        <Button type="submit" variant="primary" size="lg" loading={busy} block>{t("Save password")}</Button>
      </form>
    </div>
  );
}
