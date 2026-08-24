import { useState } from "react";
import type { MenuCategory, MenuCategoryKey, MenuItem, Page } from "@/app/types";
import { MenuList } from "@/app/components/menu/MenuList";
import heroImage from "@/imports/mantel-landing.webp";
import fridayImage from "@/imports/mood-late-checkout.jpg";

type Props = {
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
  linkTo: (p: Page, c?: MenuCategory) => {
    href: string;
    onClick: (e: React.MouseEvent) => void;
  };
};

export function Home({ sections, linkTo }: Props) {
  const [cookieOpen, setCookieOpen] = useState(true);
  const [showCookieOptions, setShowCookieOptions] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSent, setNewsletterSent] = useState(false);
  const preview = sections.filter(([, items]) => items.length > 0).slice(0, 2);

  const submitNewsletter = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newsletterEmail.trim()) setNewsletterSent(true);
  };

  return (
    <div className="editorial-home">
      <section className="editorial-hero" aria-label="Mantel introduction">
        <img src={heroImage} alt="A Mantel shirt in the warm light of the café" />
        <div className="editorial-hero-content">
          <span className="editorial-kicker">Bahrain</span>
          <h1>Mantel.</h1>
          <div className="editorial-hero-links">
            <a {...linkTo("menu")} className="editorial-link">Menu</a>
          </div>
        </div>
      </section>

      <section className="editorial-intro" id="menu">
        <div className="editorial-intro-copy">
          <p className="editorial-overline">01 — A Mantel ritual</p>
          <h2>Our Friday nights, or our espresso Friday.</h2>
          <p>
            A small room, a good espresso, and the feeling that the week has finally made it to
            the other side. Come as you are. Stay for another cup.
          </p>
          <div className="editorial-inline-links">
            <a {...linkTo("menu")} className="editorial-link">View the menu</a>
            <a {...linkTo("contact")} className="editorial-link">Find us</a>
          </div>
        </div>
        <div className="editorial-intro-media">
          <img src={fridayImage} alt="A blurred evening moment that evokes a Friday at Mantel" />
        </div>
      </section>

      <section className="editorial-cafe-preview" id="cafe" aria-labelledby="cafe-heading">
        <div className="editorial-cafe-copy">
          <p className="editorial-overline">02 — The café</p>
          <h2 id="cafe-heading">Poured at the counter.</h2>
          <p>Drinks, small plates, and a little time set aside for yourself.</p>
          <a {...linkTo("menu")} className="editorial-link">Open the full menu</a>
        </div>
        <div className="editorial-cafe-list">
          {preview.length > 0 ? (
            <MenuList sections={preview} />
          ) : (
            <p className="editorial-cafe-empty">The menu is being set. Check back soon.</p>
          )}
        </div>
      </section>

      <section className="editorial-newsletter" aria-labelledby="newsletter-heading">
        <div>
          <p className="editorial-overline">03 — Keep in touch</p>
          <h2 id="newsletter-heading">Receive the newsletter.</h2>
        </div>
        <div className="editorial-newsletter-copy">
          {newsletterSent ? (
            <p className="editorial-newsletter-success">You’re on the list. See you at the counter.</p>
          ) : (
            <>
              <p>Stay up to date with new collections, events, and the occasional good idea.</p>
              <form className="editorial-newsletter-form" onSubmit={submitNewsletter}>
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  placeholder="Email address"
                  aria-label="Email address"
                  required
                />
                <button type="submit">Submit ↗</button>
              </form>
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
              <button className="editorial-cookie-dismiss" type="button" onClick={() => setCookieOpen(false)}>
                Continue without accepting
              </button>
            </div>
            <p className="editorial-cookie-copy">
              To offer you a better experience, this site uses cookies and similar technologies for
              technical purposes and, with your consent, also for personalizing ads. For more
              information or to select your preferences click on “Monitoring Management” or read our
              <a href="#cookie-policy"> Cookie Policy</a> and <a href="#privacy-policy">Privacy Policy</a>.
            </p>
            {showCookieOptions && (
              <div className="editorial-cookie-options">
                <label className="editorial-cookie-option"><input type="checkbox" defaultChecked /> Essential</label>
                <label className="editorial-cookie-option"><input type="checkbox" /> Analytics</label>
                <label className="editorial-cookie-option"><input type="checkbox" /> Marketing</label>
              </div>
            )}
            <button
              className="editorial-cookie-preferences"
              type="button"
              onClick={() => setShowCookieOptions((visible) => !visible)}
            >
              {showCookieOptions ? "Hide preferences" : "Preferences"}
            </button>
            <button className="editorial-cookie-button" type="button" onClick={() => setCookieOpen(false)}>
              Accept All
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
