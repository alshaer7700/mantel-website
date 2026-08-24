import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { CONTACT_ENDPOINT } from "@/lib/constants";

/* "Be the first to know" section styled after the inspiration reference:
   big display headline, quiet subline, pill email field with an arrow
   submit. Sign-ups arrive as emails via FormSubmit, same as the contact
   form — no extra backend. */
export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  // Anti-abuse, same as the contact form: hidden honeypot (FormSubmit
  // discards submissions where _honey is non-empty) + a short cooldown so
  // the endpoint can't be hammered from the UI.
  const [honeypot, setHoneypot] = useState("");
  const lastSentAt = useRef(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() - lastSentAt.current < 30_000) return;
    setStatus("sending");
    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: email.trim().slice(0, 254),
          _honey: honeypot,
          _subject: "MANTEL newsletter signup",
          _captcha: "false",
          _template: "table",
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      lastSentAt.current = Date.now();
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  return (
    <section className="max-w-2xl w-full mx-auto px-6 py-16 text-center">
      <h2 className="font-serif font-normal tracking-[-0.018em] leading-[0.94] text-[clamp(1.9rem,5vw,3.4rem)] m-0 mb-[var(--s-2)] text-[color:var(--ink)]">
        New Sips, First Look.
      </h2>
      <p className="font-mono text-[length:var(--fs-desc)] leading-[1.6] text-[color:var(--ink-muted)] mb-[var(--s-4)]">
        Be the first to know when new drinks land at Mantel.
      </p>
      {status === "sent" ? (
        <p className="font-mono font-normal text-sm text-muted-foreground py-4">
          You{"'"}re on the list. 💌
        </p>
      ) : (
        <form
          onSubmit={submit}
          className="flex items-center gap-[var(--s-2)] max-w-md mx-auto border-b border-[color:var(--line)] focus-within:border-[color:var(--ink)] transition-colors"
        >
          <input
            type="text"
            name="_honey"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />
          <label htmlFor="nl-email" className="sr-only">Email address</label>
          <input
            id="nl-email"
            type="email"
            required
            maxLength={254}
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 min-w-0 bg-transparent px-0 py-[10px] font-serif text-[length:var(--fs-item)] text-[color:var(--ink)] placeholder:text-[color:var(--ink-muted)] outline-none text-center"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            aria-label="Sign up"
            className="shrink-0 text-[color:var(--ink)] hover:opacity-60 transition-opacity disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--brand)]"
          >
            <ArrowRight size={20} strokeWidth={1.5} />
          </button>
        </form>
      )}
      {status === "error" && (
        <p role="alert"
          className="font-mono text-[11px] leading-[1.5] text-[color:var(--brand)] mt-[var(--s-2)]">
          Couldn{"'"}t sign you up right now — please try again.
        </p>
      )}
    </section>
  );
}
