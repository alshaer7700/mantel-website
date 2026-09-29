import { useEffect, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail } from "lucide-react";
import { supabase } from "@/lib/api/staffClient";
import { useT } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { Button, EMAIL_RE, TextField } from "@/admin/ui/controls";
import { Card, Notice } from "@/admin/ui/layout";
import { Modal, useToast } from "@/admin/ui/overlays";

/*
 * The two things every person on the team must be able to change without
 * help: the email they sign in with, and their password. Both ask for the
 * current password first, so someone who walks up to an unlocked tablet
 * can't take over the account.
 */

async function checkPassword(email: string, password: string): Promise<boolean> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

function PasswordInput({ id, label, value, onChange, autoComplete, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; autoComplete: string; hint?: string }) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <div className="adm-field">
      <label className="adm-label" htmlFor={id}>{label}</label>
      <div className="adm-input-affix" dir="ltr">
        <input id={id} className="adm-input" type={show ? "text" : "password"} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} />
        <button type="button" className="adm-icon-btn" onClick={() => setShow((s) => !s)} aria-label={show ? t("Hide password") : t("Show password")} style={{ height: "auto" }}>
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {hint && <p className="adm-hint">{hint}</p>}
    </div>
  );
}

function strength(password: string): { label: string; tone: "danger" | "warn" | "ok" } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return { label: "Weak", tone: "danger" };
  if (score <= 3) return { label: "Okay", tone: "warn" };
  return { label: "Strong", tone: "ok" };
}

export function SignInDetails() {
  const t = useT();
  const toast = useToast();
  const { me, reloadMe } = useAdmin();
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState("");

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setPendingEmail(data.user?.new_email ?? null));
  }, [me.email]);

  const changeEmail = async () => {
    setEmailError("");
    const target = newEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(target)) return setEmailError(t("Enter a valid email address."));
    if (target === me.email.toLowerCase()) return setEmailError(t("That's already your sign-in email."));
    if (!emailPassword) return setEmailError(t("Enter your current password to confirm it's you."));
    setEmailBusy(true);
    if (!(await checkPassword(me.email, emailPassword))) {
      setEmailBusy(false);
      return setEmailError(t("That password isn't right."));
    }
    const { error } = await supabase.auth.updateUser({ email: target }, { emailRedirectTo: `${window.location.origin}/admin/account` });
    setEmailBusy(false);
    if (error) {
      const msg = error.message.toLowerCase();
      return setEmailError(
        msg.includes("already") || msg.includes("registered")
          ? t("Another account already uses that email.")
          : msg.includes("rate") ? t("Too many attempts. Wait a few minutes and try again.")
          : t("Couldn't change the email right now. Try again in a moment."),
      );
    }
    setPendingEmail(target);
    setEmailOpen(false);
    setNewEmail("");
    setEmailPassword("");
    toast.ok(t("Confirmation link sent to {email}", { email: target }));
  };

  const changePassword = async () => {
    setPasswordError("");
    if (!current) return setPasswordError(t("Enter your current password."));
    if (next.length < 8) return setPasswordError(t("The new password needs at least 8 characters."));
    if (next !== again) return setPasswordError(t("The two new passwords don't match."));
    if (next === current) return setPasswordError(t("Choose a password different from the current one."));
    setPasswordBusy(true);
    if (!(await checkPassword(me.email, current))) {
      setPasswordBusy(false);
      return setPasswordError(t("Your current password isn't right."));
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setPasswordBusy(false);
    if (error) {
      return setPasswordError(
        error.message.toLowerCase().includes("weak") || error.message.toLowerCase().includes("pwned")
          ? t("That password is too easy to guess. Try a longer one.")
          : t("Couldn't change the password right now. Try again in a moment."),
      );
    }
    setPasswordOpen(false);
    setCurrent("");
    setNext("");
    setAgain("");
    toast.ok(t("Password changed. Use the new one next time you sign in."));
    await reloadMe();
  };

  const s = strength(next);

  return (
    <Card title={t("Sign-in details")} subtitle={t("The email and password you use to open this dashboard.")} className="adm-span-all">
      <div className="adm-grid-2">
        <div className="adm-stack" style={{ gap: 8 }}>
          <span className="adm-label"><Mail size={16} aria-hidden="true" /> {t("Email")}</span>
          <strong dir="ltr" style={{ fontSize: 17, overflowWrap: "anywhere" }}>{me.email}</strong>
          {pendingEmail && (
            <Notice tone="warn" title={t("Waiting for confirmation")}>
              {t("Open the link sent to {email} to finish the change. Until then, keep signing in with {current}.", { email: pendingEmail, current: me.email })}
            </Notice>
          )}
          <div><Button onClick={() => setEmailOpen(true)}>{t("Change email")}</Button></div>
        </div>
        <div className="adm-stack" style={{ gap: 8 }}>
          <span className="adm-label"><KeyRound size={16} aria-hidden="true" /> {t("Password")}</span>
          <strong style={{ fontSize: 17, letterSpacing: 3 }} aria-label={t("Hidden")}>••••••••</strong>
          <div><Button onClick={() => setPasswordOpen(true)}>{t("Change password")}</Button></div>
        </div>
      </div>

      <Modal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        title={t("Change sign-in email")}
        footer={<><Button onClick={() => setEmailOpen(false)}>{t("Cancel")}</Button><Button variant="primary" loading={emailBusy} onClick={changeEmail}>{t("Send confirmation link")}</Button></>}
      >
        <p>{t("We'll email a link to the new address. The change only happens after you open it, so a typo can't lock you out. If a second email arrives at your current address, open that link too.")}</p>
        <TextField label={t("New email")} type="email" inputMode="email" autoComplete="email" value={newEmail} onChange={setNewEmail} dir="ltr" />
        <PasswordInput id="adm-email-pass" label={t("Current password")} value={emailPassword} onChange={setEmailPassword} autoComplete="current-password" />
        {emailError && <p className="adm-error" role="alert">{emailError}</p>}
        <Notice>{t("This only changes how you sign in. The address that receives order and message emails is under Messages → Notifications.")}</Notice>
      </Modal>

      <Modal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        title={t("Change password")}
        footer={<><Button onClick={() => setPasswordOpen(false)}>{t("Cancel")}</Button><Button variant="primary" loading={passwordBusy} onClick={changePassword}>{t("Save new password")}</Button></>}
      >
        <PasswordInput id="adm-pass-current" label={t("Current password")} value={current} onChange={setCurrent} autoComplete="current-password" />
        <PasswordInput id="adm-pass-new" label={t("New password")} value={next} onChange={setNext} autoComplete="new-password" hint={t("At least 8 characters. A short sentence is easy to remember and hard to guess.")} />
        {next && <span className={`adm-badge adm-badge-${s.tone}`} style={{ justifySelf: "start" }}>{t(s.label)}</span>}
        <PasswordInput id="adm-pass-again" label={t("Type the new password again")} value={again} onChange={setAgain} autoComplete="new-password" />
        {passwordError && <p className="adm-error" role="alert">{passwordError}</p>}
        <p className="adm-small adm-muted">{t("Forgot the current one? Sign out and use “Forgot password?” on the sign-in screen.")}</p>
      </Modal>
    </Card>
  );
}
