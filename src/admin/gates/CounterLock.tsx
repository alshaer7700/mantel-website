import { useCallback, useEffect, useState } from "react";
import { Delete, Lock } from "lucide-react";
import { useT } from "@/admin/i18n";
import type { Me } from "@/admin/context";
import { rpc, setCounterToken } from "@/admin/lib/db";
import { Button } from "@/admin/ui/controls";
import { Loading } from "@/admin/ui/layout";

/*
 * Counter mode. One tablet stays signed in at the bar; each barista unlocks it
 * with their own 4-digit PIN, and everything they change is recorded under
 * their name in the activity log (the PIN session travels as a request header
 * that the audit trigger reads — see counter_actor() in supabase/028).
 */

const LOCK_KEY = "mantel-counter-locked";
const TOKEN_KEY = "mantel-counter-token";

function read(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key) ?? window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
  } catch {
    /* Counter mode still works for this page view. */
  }
}

export function useCounterLock(me: Me) {
  const [locked, setLocked] = useState(() => read(LOCK_KEY) === "1");
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    const token = read(TOKEN_KEY);
    if (token) setCounterToken(token);
    void rpc<{ user_id: string }[]>("admin_counter_staff").then((r) => {
      setAvailable(r.ok && (r.value?.length ?? 0) > 0);
    });
  }, [me.user_id]);

  const lock = useCallback(() => {
    setCounterToken(null);
    write(TOKEN_KEY, null);
    write(LOCK_KEY, "1");
    setLocked(true);
  }, []);

  const unlock = useCallback((token: string) => {
    setCounterToken(token);
    write(TOKEN_KEY, token);
    write(LOCK_KEY, null);
    setLocked(false);
  }, []);

  return { locked: locked && available, available, lock, unlock };
}

type CounterStaff = { user_id: string; name: string };

export function CounterLock({ me, onUnlocked }: { me: Me; onUnlocked: (token: string) => void }) {
  const t = useT();
  const [staff, setStaff] = useState<CounterStaff[] | null>(null);
  const [who, setWho] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void rpc<CounterStaff[]>("admin_counter_staff").then((r) => setStaff(r.ok ? r.value ?? [] : []));
  }, [me.user_id]);

  const submit = useCallback(async (value: string) => {
    if (!who) return;
    setBusy(true);
    const result = await rpc<string>("admin_counter_unlock", { p_staff_id: who, p_pin: value });
    setBusy(false);
    if (!result.ok || !result.value) {
      setError(t("Wrong PIN. Try again."));
      setPin("");
      return;
    }
    onUnlocked(result.value);
  }, [who, onUnlocked, t]);

  const press = (digit: string) => {
    if (busy) return;
    setError("");
    const next = (pin + digit).slice(0, 6);
    setPin(next);
    if (next.length === 4) void submit(next);
  };

  return (
    <div className="adm-lock" role="dialog" aria-modal="true" aria-label={t("Counter locked")}>
      <div className="adm-stack" style={{ width: "min(380px, 100%)", gap: 20, justifyItems: "center", textAlign: "center" }}>
        <Lock size={28} aria-hidden="true" />
        <h1 className="adm-gate-title">{who ? t("Enter your PIN") : t("Who's at the counter?")}</h1>
        {staff === null ? (
          <Loading />
        ) : !who ? (
          <div className="adm-stack" style={{ width: "100%" }}>
            {staff.map((s) => (
              <Button key={s.user_id} size="lg" block onClick={() => setWho(s.user_id)}>{s.name}</Button>
            ))}
          </div>
        ) : (
          <>
            <div className="adm-pin-dots" aria-label={t("{n} of 4 digits entered", { n: pin.length })}>
              {[0, 1, 2, 3].map((i) => <span key={i} className={i < pin.length ? "is-on" : ""} />)}
            </div>
            {error && <p className="adm-error" role="alert">{error}</p>}
            <div className="adm-pinpad" dir="ltr">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                <button key={d} type="button" onClick={() => press(d)}>{d}</button>
              ))}
              <button type="button" onClick={() => { setWho(null); setPin(""); }} aria-label={t("Back")} style={{ fontSize: 14 }}>{t("Back")}</button>
              <button type="button" onClick={() => press("0")}>0</button>
              <button type="button" onClick={() => setPin((p) => p.slice(0, -1))} aria-label={t("Delete digit")}><Delete size={20} /></button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
