import type { Dispatch, FormEvent, SetStateAction } from "react";
import { ArrowUpRight, Mail, Search } from "lucide-react";
import type { MenuCategory, Page } from "@/app/types";

export type ContactForm = {
  name: string;
  lastName: string;
  email: string;
  phone: string;
  comment: string;
};

type Props = {
  linkTo: (p: Page, c?: MenuCategory) => {
    href: string;
    onClick: (e: React.MouseEvent) => void;
  };
  form: ContactForm;
  setForm: Dispatch<SetStateAction<ContactForm>>;
  honeypot: string;
  setHoneypot: Dispatch<SetStateAction<string>>;
  sent: boolean;
  sending: boolean;
  sendError: string;
  submitContact: (event: FormEvent<HTMLFormElement>) => void;
};

const inputClassName = "editorial-contact-input";

export function ContactUs({
  linkTo,
  form,
  setForm,
  honeypot,
  setHoneypot,
  sent,
  sending,
  sendError,
  submitContact,
}: Props) {
  const update = (field: keyof ContactForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const jumpToForm = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    document.getElementById("mantel-contact-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="editorial-contact-page" aria-labelledby="contact-page-title">
      <aside className="editorial-contact-rail" aria-label="Client Care navigation">
        <div>
          <p className="editorial-overline">Client Care</p>
          <h1>Can we help?</h1>
        </div>

        <div className="editorial-contact-rail-actions" aria-label="Contact shortcuts">
          <a href="#mantel-contact-form" onClick={jumpToForm}>
            <Search size={15} strokeWidth={1.5} aria-hidden="true" />
            Search
          </a>
          <a href="#mantel-contact-form" onClick={jumpToForm}>
            <Mail size={14} strokeWidth={1.5} aria-hidden="true" />
            Email
          </a>
        </div>

        <nav className="editorial-contact-rail-nav" aria-label="Support sections">
          <div className="editorial-contact-rail-group">
            <p>Client Care</p>
            <a {...linkTo("contact")}>Contact Us</a>
          </div>
          <div className="editorial-contact-rail-group">
            <p>Our Places</p>
            <a {...linkTo("menu")}>Menu</a>
            <a {...linkTo("objects")}>Retail</a>
          </div>
          <div className="editorial-contact-rail-group">
            <p>Support</p>
            <a {...linkTo("faq")}>FAQs</a>
          </div>
          <div className="editorial-contact-rail-group">
            <p>Legal Area</p>
            <a {...linkTo("privacy")}>Privacy</a>
            <a {...linkTo("terms")}>Terms</a>
          </div>
        </nav>
      </aside>

      <div className="editorial-contact-main">
        <div className="editorial-contact-heading">
          <p className="editorial-overline">Client Care</p>
          <h2 id="contact-page-title">Contact Us</h2>
        </div>

        <div className="editorial-contact-copy">
          <p>We will respond to every email within 24 hours, from Monday to Saturday.</p>
          <p>For wholesale, press, café, retail, or general feedback, send us a note and tell us how we can help.</p>
        </div>

        <div className="editorial-contact-form-wrap" id="mantel-contact-form">
          {sent ? (
            <div className="editorial-contact-success" role="status">
              <p className="editorial-overline">Message received</p>
              <h3>Thank you — we’ll be in touch soon.</h3>
              <p>Your note has been sent to the Mantel team.</p>
            </div>
          ) : (
            <form className="editorial-contact-form" onSubmit={submitContact}>
              <input
                type="text"
                name="_honey"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="editorial-contact-honeypot"
              />

              <div className="editorial-contact-form-row">
                <label>
                  First name
                  <input className={inputClassName} type="text" value={form.name} onChange={(event) => update("name", event.target.value)} maxLength={120} />
                </label>
                <label>
                  Last name
                  <input className={inputClassName} type="text" value={form.lastName} onChange={(event) => update("lastName", event.target.value)} maxLength={120} />
                </label>
              </div>

              <label>
                Email address <span aria-hidden="true">*</span>
                <input className={inputClassName} type="email" value={form.email} onChange={(event) => update("email", event.target.value)} maxLength={254} required />
              </label>

              <label>
                Phone number
                <input className={inputClassName} type="tel" value={form.phone} onChange={(event) => update("phone", event.target.value)} maxLength={40} />
              </label>

              <label>
                Message <span aria-hidden="true">*</span>
                <textarea className={`${inputClassName} editorial-contact-textarea`} value={form.comment} onChange={(event) => update("comment", event.target.value)} rows={6} maxLength={2000} required />
              </label>

              {sendError && <p className="editorial-contact-error" role="alert">{sendError}</p>}

              <button className="editorial-contact-submit" type="submit" disabled={sending}>
                {sending ? "Sending…" : "Send message"}
                <ArrowUpRight size={16} strokeWidth={1.4} aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
