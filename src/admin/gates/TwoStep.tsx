import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useT } from "@/admin/i18n";
import { Button, TextField } from "@/admin/ui/controls";
import { Loading, Notice } from "@/admin/ui/layout";

/*
 * Two-step sign-in with an authenticator app (Google Authenticator, Microsoft
 * Authenticator, 1Password …). Shown when Team → Security requires it and this
 * session hasn't done the second step yet — and reused from My account to set
 * it up voluntarily.
 */

type Enrollment = { factorId: string; qr: string; secret: string };

export function TwoStepSetup({ onVerified, compact }: { onVerified: () => void; compact?: boolean }) {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    void (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      if (!live) return;
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
      } else {
        // Clear half-finished attempts so a fresh QR code can be made.
        for (const f of data?.all ?? []) {
          if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
        }
        const { data: enrolled, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Mantel ${new Date().toISOString().slice(0, 10)}` });
        if (!live) return;
        if (enrollError || !enrolled) setError(t("Couldn't start two-step setup. Try again in a moment."));
        else setEnrollment({ factorId: enrolled.id, qr: enrolled.totp.qr_code, secret: enrolled.totp.secret });
      }
      setLoading(false);
    })();
    return () => {
      live = false;
    };
  }, [t]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = factorId ?? enrollment?.factorId;
    if (!id) return;
    setBusy(true);
    setError("");
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code: code.replace(/\s/g, "") });
    setBusy(false);
    if (verifyError) {
      setError(t("That code didn't work. Codes change every 30 seconds — use the newest one."));
      return;
    }
    onVerified();
  };

  if (loading) return <Loading />;

  return (
    <form className="adm-stack" onSubmit={verify}>
      {enrollment && (
        <>
          <p>{t("1. Install an authenticator app on your phone, such as Google Authenticator or Microsoft Authenticator.")}</p>
          <p>{t("2. In the app, add an account and scan this code:")}</p>
          <div style={{ background: "#fff", padding: 12, borderRadius: 10, justifySelf: "start" }}>
            <img src={enrollment.qr} alt={t("QR code for your authenticator app")} width={180} height={180} />
          </div>
          <p className="adm-small adm-muted">
            {t("Can't scan? Type this key into the app instead:")} <code dir="ltr" style={{ userSelect: "all" }}>{enrollment.secret}</code>
          </p>
          <p>{t("3. Enter the 6-digit code the app shows:")}</p>
        </>
      )}
      {!enrollment && !compact && <p>{t("Open your authenticator app and enter the 6-digit code for Mantel.")}</p>}
      <TextField label={t("6-digit code")} value={code} onChange={setCode} inputMode="numeric" autoComplete="one-time-code" maxLength={8} dir="ltr" />
      {error && <p className="adm-error" role="alert">{error}</p>}
      <Button type="submit" variant="primary" loading={busy} disabled={code.replace(/\s/g, "").length < 6}>{t("Verify")}</Button>
    </form>
  );
}

export function TwoStepGate({ onVerified }: { onVerified: () => void }) {
  const t = useT();
  return (
    <div className="adm-gate">
      <div className="adm-gate-card">
        <div className="adm-brand"><ShieldCheck size={26} aria-hidden="true" /></div>
        <h1 className="adm-gate-title">{t("Two-step sign-in")}</h1>
        <Notice>{t("The team has turned on two-step sign-in. It keeps customer details safe even if a password is guessed.")}</Notice>
        <TwoStepSetup onVerified={onVerified} />
        <Button variant="ghost" onClick={() => void supabase.auth.signOut()}>{t("Sign out")}</Button>
      </div>
    </div>
  );
}
