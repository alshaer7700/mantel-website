import { useRef, useState } from "react";
import type { MenuCategory, Page } from "@/app/types";
import type { PAGE_DEFAULTS } from "@/lib/content/pages";
import { formErrorMessage, subscribeNewsletter } from "@/lib/api/forms";
import { MAPS_URL } from "@/lib/constants";

type Props = {
  linkTo: (p: Page, c?: MenuCategory) => {
    href: string;
    onClick: (e: React.MouseEvent) => void;
  };
  /** Words and photos from the dashboard's Website pages, over the defaults. */
  content: (typeof PAGE_DEFAULTS)["home"];
  /** False until the published content has had a moment to arrive, so a
      changed photo doesn't flash the old one first. */
  imagesReady: boolean;
};

type CookiePreferences = {
  analytics: boolean;
  marketing: boolean;
};

const COOKIE_CONSENT_KEY = "mantel-cookie-consent";

function readCookieConsent(): CookiePreferences | null {
  try {
    const saved = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as Partial<CookiePreferences> & { status?: string };
    if (!parsed.status) return null;
    return {
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
    };
  } catch {
    return null;
  }
}

export function Home({ linkTo, content, imagesReady }: Props) {
  const savedCookieConsent = readCookieConsent();
  const [cookieOpen, setCookieOpen] = useState(savedCookieConsent === null);
  const [showCookieOptions, setShowCookieOptions] = useState(false);
  const [cookiePreferences, setCookiePreferences] = useState<CookiePreferences>(() => ({
    analytics: savedCookieConsent?.analytics ?? false,
    marketing: savedCookieConsent?.marketing ?? false,
  }));
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [newsletterError, setNewsletterError] = useState("");
  const [newsletterHoneypot, setNewsletterHoneypot] = useState("");
  const newsletterLastSentAt = useRef(0);

  const saveCookieConsent = (status: "accepted" | "declined" | "custom", preferences: CookiePreferences) => {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({
        status,
        ...preferences,
        essential: true,
        updatedAt: new Date().toISOString(),
      }));
    } catch {
      // The banner still closes if storage is unavailable or blocked.
    }
    setCookieOpen(false);
    setShowCookieOptions(false);
  };

  const submitNewsletter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (Date.now() - newsletterLastSentAt.current < 30_000) {
      setNewsletterStatus("error");
      setNewsletterError("Please wait a moment before trying again.");
      return;
    }
    setNewsletterStatus("sending");
    setNewsletterError("");
    if (newsletterHoneypot.trim()) {
      setNewsletterStatus("sent");
      return;
    }

    const result = await subscribeNewsletter(newsletterEmail);
    if (!result.ok) {
      setNewsletterStatus("error");
      setNewsletterError(formErrorMessage(result.error));
      return;
    }
    newsletterLastSentAt.current = Date.now();
    setNewsletterStatus("sent");
  };

  return (
    <div className="editorial-home">
      <section className="editorial-hero" aria-label="Mantel introduction">
        <img className="editorial-hero-photo" src={content.hero_image} alt={content.hero_alt} style={imagesReady ? undefined : { visibility: "hidden" }} />
        <div className="editorial-hero-content">
          <div className="editorial-hero-links">
            <a {...linkTo("menu")} className="editorial-link">{content.hero_link}</a>
          </div>
        </div>
      </section>

      <section className="editorial-intro" id="menu">
        <div className="editorial-intro-copy">
          <p className="editorial-overline">{content.ritual_overline}</p>
          <h2>{content.ritual_title}</h2>
          <div className="editorial-inline-links">
            <a {...linkTo("ritual")} className="editorial-link">{content.ritual_link}</a>
            {/*
             * The one outbound link in this section, and the only reason it is a
             * plain <a> rather than a linkTo(): "Find us" means the pin on
             * Google Maps, not the contact form it used to open. Opened in a new
             * tab with rel="noopener" so the map never replaces the site, and
             * the URL lives in lib/constants so there is one place to change it.
             */}
            <a
              className="editorial-link"
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              Find us
            </a>
          </div>
        </div>
        <div className="editorial-intro-media">
          <img src={content.ritual_image} alt={content.ritual_alt} style={imagesReady ? undefined : { visibility: "hidden" }} />
        </div>
      </section>

      <section className="editorial-newsletter" aria-labelledby="newsletter-heading">
        <div>
          <p className="editorial-overline">{content.newsletter_overline}</p>
          <h2 id="newsletter-heading">{content.newsletter_title}</h2>
        </div>
        <div className="editorial-newsletter-copy">
          {newsletterStatus === "sent" ? (
            <p className="editorial-newsletter-success" role="status">{content.newsletter_thanks}</p>
          ) : (
            <>
              <p>{content.newsletter_text}</p>
              <form className="editorial-newsletter-form" onSubmit={submitNewsletter} aria-busy={newsletterStatus === "sending"}>
                <input
                  type="text"
                  name="website"
                  value={newsletterHoneypot}
                  onChange={(event) => setNewsletterHoneypot(event.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                />
                <label className="sr-only" htmlFor="home-newsletter-email">Email address</label>
                <input
                  id="home-newsletter-email"
                  type="email"
                  name="email"
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  placeholder="Email address"
                  maxLength={254}
                  required
                />
                <button type="submit" disabled={newsletterStatus === "sending"}>
                  {newsletterStatus === "sending" ? "Sending…" : "Submit ↗"}
                </button>
              </form>
              {newsletterStatus === "error" && (
                <p className="editorial-newsletter-error" role="alert">{newsletterError}</p>
              )}
            </>
          )}
        </div>
      </section>

      {cookieOpen && (
        <div className="editorial-cookie-backdrop" role="presentation">
          <section
            className="editorial-cookie-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-title"
          >
            <div className="editorial-cookie-top">
              <h2 className="editorial-cookie-title" id="cookie-title">A note on cookies</h2>
              <button
                className="editorial-cookie-dismiss"
                type="button"
                onClick={() => saveCookieConsent("declined", { analytics: false, marketing: false })}
              >
                Continue without accepting
              </button>
            </div>
            <p className="editorial-cookie-copy">
              To offer you a better experience, this site uses cookies and similar technologies for
              technical purposes and, with your consent, also for personalizing ads. For more
              information or to select your preferences click on “Monitoring Management” or read our
              <a {...linkTo("privacy")}> Privacy Policy</a>.
            </p>
            {showCookieOptions && (
              <div className="editorial-cookie-options">
                <label className="editorial-cookie-option">
                  <input type="checkbox" checked disabled />
                  Essential
                </label>
                <label className="editorial-cookie-option">
                  <input
                    type="checkbox"
                    checked={cookiePreferences.analytics}
                    onChange={(event) => setCookiePreferences((current) => ({ ...current, analytics: event.target.checked }))}
                  />
                  Analytics
                </label>
                <label className="editorial-cookie-option">
                  <input
                    type="checkbox"
                    checked={cookiePreferences.marketing}
                    onChange={(event) => setCookiePreferences((current) => ({ ...current, marketing: event.target.checked }))}
                  />
                  Marketing
                </label>
                <button
                  className="editorial-cookie-save"
                  type="button"
                  onClick={() => saveCookieConsent("custom", cookiePreferences)}
                >
                  Save preferences
                </button>
              </div>
            )}
            {!showCookieOptions && (
              <button
                className="editorial-cookie-preferences"
                type="button"
                onClick={() => setShowCookieOptions(true)}
              >
                Preferences
              </button>
            )}
            <button
              className="editorial-cookie-button"
              type="button"
              onClick={() => saveCookieConsent("accepted", { analytics: true, marketing: true })}
            >
              Accept All
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
