import { useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useLang, useT } from "@/admin/i18n";
import { roleLabel, useAdmin } from "@/admin/context";
import { rpc } from "@/admin/lib/db";
import { Button, Segmented, TextField } from "@/admin/ui/controls";
import { Badge, Card, Notice, PageHeader } from "@/admin/ui/layout";
import { Modal, useToast } from "@/admin/ui/overlays";
import { TwoStepSetup } from "@/admin/gates/TwoStep";
import { useTextSize, type TextSize } from "@/admin/lib/textSize";
import { SignInDetails } from "@/admin/sections/account/SignInDetails";

export function AccountSection() {
  const t = useT();
  const toast = useToast();
  const { lang, setLang } = useLang();
  const { me, reloadMe, theme, setTheme } = useAdmin();
  const textSize = useTextSize();
  const [name, setName] = useState(me.display_name);
  const [savingName, setSavingName] = useState(false);
  const [twoStepOpen, setTwoStepOpen] = useState(false);
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);

  const saveName = async () => {
    setSavingName(true);
    const r = await rpc("admin_set_my_preferences", { p_language: lang, p_display_name: name.trim() });
    setSavingName(false);
    if (!r.ok) toast.error(r.error);
    else {
      toast.ok(t("Name saved"));
      await reloadMe();
    }
  };

  const savePin = async () => {
    if (!/^\d{4}$/.test(pin)) return toast.error(t("The PIN must be exactly 4 digits."));
    setSavingPin(true);
    const r = await rpc("admin_set_my_pin", { p_pin: pin });
    setSavingPin(false);
    if (!r.ok) toast.error(r.error);
    else {
      setPin("");
      setPinOpen(false);
      toast.ok(t("PIN saved"));
      await reloadMe();
    }
  };

  return (
    <>
      <PageHeader title={t("My account")} subtitle={t("Your own preferences. They don't change anything for the rest of the team.")} />
      <SignInDetails />
      <div className="adm-grid-2">
        <Card title={t("About you")}>
          <div className="adm-spread">
            <span className="adm-muted" dir="ltr">{me.email}</span>
            <Badge tone="dark">{t(roleLabel(me.role))}</Badge>
          </div>
          <TextField label={t("Your name")} value={name} onChange={setName} hint={t("Shown in the activity log and on the counter lock screen.")} maxLength={60} />
          <div><Button variant="primary" onClick={saveName} loading={savingName} disabled={!name.trim() || name.trim() === me.display_name}>{t("Save name")}</Button></div>
        </Card>

        <Card title={t("Look and language")}>
          <div className="adm-field">
            <span className="adm-label">{t("Language")}</span>
            <Segmented label={t("Language")} value={lang} onChange={setLang} options={[{ value: "en", label: "English" }, { value: "ar", label: "العربية" }]} />
          </div>
          <div className="adm-field">
            <span className="adm-label">{t("Colours")}</span>
            <Segmented
              label={t("Colours")}
              value={theme}
              onChange={setTheme}
              options={[
                { value: "system", label: t("Automatic") },
                { value: "light", label: t("Light") },
                { value: "dark", label: t("Dark") },
              ]}
            />
            <p className="adm-hint">{t("Dark is easier on the eyes at the bar in the evening.")}</p>
          </div>
          <div className="adm-field">
            <span className="adm-label">{t("Text size")}</span>
            <Segmented<TextSize>
              label={t("Text size")}
              value={textSize.size}
              onChange={textSize.setSize}
              options={[
                { value: "small", label: t("Small") },
                { value: "normal", label: t("Normal") },
                { value: "large", label: t("Large") },
                { value: "xlarge", label: t("Extra large") },
              ]}
            />
            <p className="adm-hint">{t("For the whole dashboard on this device. Printed documents don't change.")}</p>
          </div>
        </Card>

        <Card title={t("Extra security")}>
          <div className="adm-spread">
            <div className="adm-stack" style={{ gap: 2 }}>
              <strong className="adm-row" style={{ gap: 6 }}><ShieldCheck size={16} /> {t("Two-step sign-in")}</strong>
              <span className="adm-small adm-muted">{t("Ask for a code from your phone when signing in.")}</span>
            </div>
            {me.aal === "aal2" ? <Badge tone="ok">{t("On")}</Badge> : <Button onClick={() => setTwoStepOpen(true)}>{t("Set up")}</Button>}
          </div>
          <hr className="adm-divider" />
          <div className="adm-spread">
            <div className="adm-stack" style={{ gap: 2 }}>
              <strong className="adm-row" style={{ gap: 6 }}><KeyRound size={16} /> {t("Counter PIN")}</strong>
              <span className="adm-small adm-muted">{t("A 4-digit code to unlock the shared counter tablet as yourself.")}</span>
            </div>
            <Button onClick={() => setPinOpen(true)}>{me.has_pin ? t("Change PIN") : t("Set PIN")}</Button>
          </div>
        </Card>
      </div>

      <Modal open={twoStepOpen} onClose={() => setTwoStepOpen(false)} title={t("Set up two-step sign-in")}>
        <TwoStepSetup onVerified={async () => { setTwoStepOpen(false); toast.ok(t("Two-step sign-in is on")); await reloadMe(); }} />
      </Modal>

      <Modal
        open={pinOpen}
        onClose={() => setPinOpen(false)}
        title={me.has_pin ? t("Change PIN") : t("Set PIN")}
        footer={<><Button onClick={() => setPinOpen(false)}>{t("Cancel")}</Button><Button variant="primary" onClick={savePin} loading={savingPin}>{t("Save PIN")}</Button></>}
      >
        <Notice>{t("Avoid easy guesses like 1234 or your birthday. Don't share it with the team.")}</Notice>
        <TextField label={t("New PIN")} type="password" inputMode="numeric" maxLength={4} value={pin} onChange={(v) => setPin(v.replace(/\D/g, ""))} dir="ltr" autoComplete="off" />
      </Modal>
    </>
  );
}
