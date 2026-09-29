/*
 * New-order alerts for the counter: a chime, a system notification when the
 * dashboard is in the background, and a count in the browser tab.
 *
 * Browsers only allow sound after someone has tapped the page, which is why
 * the board has an explicit "Turn on sound" button rather than chiming by
 * itself on first load.
 */

const SOUND_KEY = "mantel-admin-sound";

let ctx: AudioContext | null = null;

export function soundEnabled(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) === "1";
  } catch {
    return false;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    window.localStorage.setItem(SOUND_KEY, on ? "1" : "0");
  } catch {
    /* preference only */
  }
  if (on) unlockAudio();
}

export function unlockAudio() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    ctx = ctx ?? new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

/** Two soft notes, like a counter bell. */
export function chime() {
  if (!soundEnabled()) return;
  unlockAudio();
  if (!ctx) return;
  const now = ctx.currentTime;
  [880, 1318.5].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.18;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start);
    osc.stop(start + 0.65);
  });
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function askNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}

export function notify(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  if (document.visibilityState === "visible" && document.hasFocus()) return;
  try {
    new Notification(title, { body, icon: "/heart.webp", tag: "mantel-order" });
  } catch {
    /* Some mobile browsers only allow notifications from a service worker. */
  }
}
