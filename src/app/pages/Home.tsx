import { useState } from "react";
import type { ShopObject } from "@/lib/api/objects";
import type { MenuCategory, MenuCategoryKey, MenuItem, Page } from "@/app/types";
import heroImage from "@/imports/mantel-landing.png";
import coffeeBarImage from "@/imports/mood-coffee-bar.jpg";
import cafeServiceImage from "@/imports/mood-cafe-service.jpg";
import rugImage from "@/imports/mood-rug.jpg";
import bouquetImage from "@/imports/mood-bouquet.jpg";
import menuIllustrationImage from "@/imports/mood-menu-illustration.jpg";
import coffeeCollageImage from "@/imports/mood-coffee-collage.jpg";
import saturdaySignImage from "@/imports/mood-saturday-sign.jpg";
import lateCheckoutImage from "@/imports/mood-late-checkout.jpg";

type Props = {
  sections: ReadonlyArray<readonly [MenuCategoryKey, MenuItem[]]>;
  objects: ShopObject[];
  linkTo: (p: Page, c?: MenuCategory) => {
    href: string;
    onClick: (e: React.MouseEvent) => void;
  };
};

type Product = {
  name: string;
  type: string;
  image: string;
  href: string;
};

const products: Product[] = [
  { name: "The Menu", type: "Coffee / food", image: menuIllustrationImage, href: "#menu" },
  { name: "House Coffee", type: "Beans / 250g", image: coffeeCollageImage, href: "#objects" },
  { name: "Objects", type: "Small editions", image: rugImage, href: "#objects" },
  { name: "Saturday", type: "At the counter", image: saturdaySignImage, href: "#story" },
  { name: "Late Checkout", type: "A place to pause", image: lateCheckoutImage, href: "#story" },
];

export function Home({ linkTo }: Props) {
  const [cookieOpen, setCookieOpen] = useState(true);
  const [showCookieOptions, setShowCookieOptions] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterSent, setNewsletterSent] = useState(false);

  const submitNewsletter = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newsletterEmail.trim()) setNewsletterSent(true);
  };

  return (
    <div className="editorial-home">
      <section className="editorial-hero" aria-label="Mantel introduction">
        <img src={heroImage} alt="A Mantel shirt in the warm light of the café" />
        <div className="editorial-hero-content">
          <span className="editorial-kicker">Hidd, Kingdom of Bahrain · Est. 2026</span>
          <h1>Mantel.</h1>
          <p>A café and a small house of objects.</p>
          <div className="editorial-hero-links">
            <a href="#menu" className="editorial-link">The café</a>
            <a href="#objects" className="editorial-link">The objects</a>
          </div>
        </div>
      </section>

      <section className="editorial-intro" id="menu">
        <div className="editorial-intro-copy">
          <p className="editorial-overline">01 — Fall / Winter 2026</p>
          <h2>Made for the everyday ritual.</h2>
          <p>
            Reworked coffee rituals, airy interiors, paper textures, and a small edit of things
            worth keeping after. Come in for a cup. Leave with a story.
          </p>
          <div className="editorial-inline-links">
            <a {...linkTo("menu")} className="editorial-link">View the menu</a>
            <a {...linkTo("story")} className="editorial-link">Read the story</a>
          </div>
        </div>
        <div className="editorial-intro-media">
          <img src={coffeeBarImage} alt="Warm café counter with a barista at work" />
        </div>
      </section>

      <section className="editorial-banner" id="objects">
        <img src={cafeServiceImage} alt="Coffee service in a wood-toned Mantel café" />
        <div className="editorial-banner-copy">
          <span className="editorial-kicker">02 — At the counter</span>
          <h2>Stay a little longer.</h2>
          <a {...linkTo("objects")} className="editorial-link">Explore the shelf</a>
        </div>
      </section>

      <section className="editorial-products" aria-labelledby="objects-heading">
        <div className="editorial-section-heading">
          <div>
            <p className="editorial-overline">03 — A small edit</p>
            <h2 id="objects-heading">Things worth keeping.</h2>
          </div>
          <p>Objects, coffee, and pieces of Mantel to take home with you.</p>
        </div>

        <div className="editorial-product-grid">
          {products.map((product) => (
            <a key={product.name} href={product.href} className="editorial-product-card">
              <div className="editorial-product-image">
                <img src={product.image} alt="" />
              </div>
              <div className="editorial-product-info">
                <span className="editorial-product-name">{product.name}</span>
                <span className="editorial-product-meta">{product.type}</span>
              </div>
            </a>
          ))}
        </div>
        <p className="editorial-product-caption">
          Mantel is a place for the things that sit between a morning coffee and the rest of the
          day — considered, tactile, and quietly useful.
        </p>
      </section>

      <section className="editorial-manifesto" id="story">
        <div className="editorial-manifesto-media">
          <img src={bouquetImage} alt="A bouquet of deep red flowers wrapped for the counter" />
        </div>
        <div className="editorial-manifesto-copy">
          <p className="editorial-overline">04 — The name</p>
          <h2>A place to set things down.</h2>
          <p>
            A mantel is the shelf above a fire. It is where a house puts the few things it means
            to look at every day — a photograph, a clock, a candle burned halfway down.
          </p>
          <a {...linkTo("story")} className="editorial-link">Our story</a>
        </div>
      </section>

      <section className="editorial-newsletter" aria-labelledby="newsletter-heading">
        <div>
          <p className="editorial-overline">05 — Keep in touch</p>
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
