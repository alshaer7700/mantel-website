import { useRef, useState } from "react";
import { formErrorMessage, subscribeNewsletter } from "@/lib/api/forms";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const lastSentAt = useRef(0);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (Date.now() - lastSentAt.current < 30_000) {
      setStatus("error");
      setErrorMessage("Please wait a moment before trying again.");
      return;
    }
    setStatus("sending");
    setErrorMessage("");
    if (honeypot.trim()) {
      setStatus("sent");
      return;
    }

    const result = await subscribeNewsletter(email);
    if (!result.ok) {
      setStatus("error");
      setErrorMessage(formErrorMessage(result.error));
      return;
    }
    lastSentAt.current = Date.now();
    setStatus("sent");
  };

  return (
    <section className="max-w-2xl w-full mx-auto px-6 py-16 text-center" aria-labelledby="newsletter-title">
      <h2 id="newsletter-title" className="font-grotesk font-bold uppercase text-[length:var(--fs-section-title)] tracking-[-0.02em] leading-[0.96] mb-4">
        New Sips, First Look.
      </h2>
      <p className="font-grotesk font-normal text-[13px] leading-[1.5] text-muted-foreground mb-8">
        Be the first to know when new drinks land at Mantel.
      </p>
      {status === "sent" ? (
        <p className="font-grotesk font-normal text-[13px] text-muted-foreground py-4" role="status">
          You&apos;re on the list.
        </p>
      ) : (
        <form onSubmit={submit} className="flex items-stretch max-w-md mx-auto border border-[color:var(--line)] bg-background focus-within:border-[color:var(--ink)] transition-colors">
          <input
            type="text"
            name="website"
            value={honeypot}
            onChange={(event) => setHoneypot(event.target.value)}
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-0 w-0 opacity-0"
          />
          <label className="sr-only" htmlFor="newsletter-email">Email address</label>
          <input
            id="newsletter-email"
            type="email"
            name="email"
            required
            maxLength={254}
            placeholder="Email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="flex-1 min-w-0 bg-transparent px-5 py-3.5 font-grotesk font-normal text-[13px] placeholder:text-muted-foreground outline-none"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="shrink-0 bg-[color:var(--ink)] text-[color:var(--paper)] px-6 font-grotesk font-bold text-[10px] tracking-[0.14em] uppercase hover:opacity-85 transition-opacity disabled:opacity-40"
          >
            {status === "sending" ? "Sending" : "Sign up"}
          </button>
        </form>
      )}
      {status === "error" && (
        <p className="font-grotesk font-medium text-[12px] tracking-[0.02em] text-destructive mt-3" role="alert">
          {errorMessage || "Couldn&apos;t sign you up right now — please try again."}
        </p>
      )}
    </section>
  );
}
