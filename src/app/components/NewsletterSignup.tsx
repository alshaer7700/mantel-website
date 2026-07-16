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
      <h2 className="font-display text-4xl md:text-5xl font-semibold mb-4">
        New Sips, First Look.
      </h2>
      <p className="text-sm text-muted-foreground mb-8">
        Be the first to know when new drinks land at Mantel.
      </p>
      {status === "sent" ? (
        <p className="text-sm text-muted-foreground py-4">
          You{"'"}re on the list. 💌
        </p>
      ) : (
        <form onSubmit={submit} className="flex items-center max-w-md mx-auto rounded-full border border-border bg-white focus-within:border-foreground/40 transition-colors">
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
          <input
            type="email"
            required
            maxLength={254}
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 min-w-0 bg-transparent px-6 py-3.5 text-sm placeholder:text-muted-foreground outline-none rounded-full"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            aria-label="Sign up"
            className="px-5 text-foreground hover:opacity-60 transition-opacity disabled:opacity-40"
          >
            <ArrowRight size={20} strokeWidth={1.5} />
          </button>
        </form>
      )}
      {status === "error" && (
        <p className="text-xs text-destructive mt-3">
          Couldn{"'"}t sign you up right now — please try again.
        </p>
      )}
    </section>
  );
}
