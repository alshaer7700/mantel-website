import { Instagram } from "lucide-react";
import type { MenuCategory, Page } from "@/app/types";
import { MAPS_URL } from "@/lib/constants";

/*
 * The footer.
 *
 * It used to be two columns of links and a lone Instagram glyph — the least
 * considered surface on the site, and the one every page ends on. The
 * reference storefronts all end the same way and it is worth copying: the name
 * set large enough to act as a full stop, then the small print arranged in
 * columns under it, then one quiet line of state.
 *
 * Everything here is real. The wordmark, the four link columns and the
 * Instagram account already existed; "Find us" is MAPS_URL, the same constant
 * the home page's link reads. No address, phone number or opening hours are
 * invented — where the shop is is a link to the pin, not a street line nobody
 * confirmed.
 */

type Props = {
  linkTo: (page: Page, category?: MenuCategory, objectId?: string | null) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
};

const INSTAGRAM = "https://www.instagram.com/bymantel?igsi=MTk3NDhxZGVuNWFucA==";

export function EditorialFooter({ linkTo }: Props) {
  return (
    <footer className="editorial-footer" id="footer">
      {/* The name as a full stop. Set to the width of the page, which is the
          one move every store in the reference set makes at the bottom. */}
      <div className="editorial-footer-mark" aria-hidden="true">Mantel.</div>

      <div className="editorial-footer-grid">
        <div className="editorial-footer-col">
          <p className="editorial-footer-title">Client Care</p>
          <a {...linkTo("contact")} className="editorial-footer-link">Contact us</a>
          <a {...linkTo("faq")} className="editorial-footer-link">FAQs</a>
        </div>

        <div className="editorial-footer-col">
          <p className="editorial-footer-title">Legal</p>
          <a {...linkTo("terms")} className="editorial-footer-link">Terms</a>
          <a {...linkTo("privacy")} className="editorial-footer-link">Privacy</a>
          <a {...linkTo("refund")} className="editorial-footer-link">Refunds</a>
          <a href="#cookie-policy" className="editorial-footer-link">Cookie</a>
          <a href="#accessibility" className="editorial-footer-link">Accessibility</a>
        </div>

        <div className="editorial-footer-col">
          <p className="editorial-footer-title">Shop</p>
          <a {...linkTo("menu")} className="editorial-footer-link">Menu</a>
          <a {...linkTo("objects")} className="editorial-footer-link">Retail</a>
          <a {...linkTo("story")} className="editorial-footer-link">About Us</a>
        </div>

        <div className="editorial-footer-col">
          <p className="editorial-footer-title">Visit</p>
          {/* Not a street line — the pin. See MAPS_URL. */}
          <a
            className="editorial-footer-link"
            href={MAPS_URL}
            target="_blank"
            rel="noreferrer"
          >
            Hidd, Muharraq <span aria-hidden="true">↗</span>
          </a>
          {/* Already published on the Contact page, so it is a fact the site
              stands behind rather than a new claim. Note these are the
              PHONE LINE's hours, which is why no opening time appears here
              or in the ticker. */}
          <a className="editorial-footer-link" href="tel:+9733170385098">
            +973 3170 385098
          </a>
          <a
            className="editorial-footer-link"
            href={INSTAGRAM}
            target="_blank"
            rel="noreferrer"
          >
            Instagram <span aria-hidden="true">↗</span>
          </a>
          <a
            className="editorial-footer-ig"
            href={INSTAGRAM}
            target="_blank"
            rel="noreferrer"
            aria-label="Mantel on Instagram"
          >
            <Instagram size={15} strokeWidth={1.6} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="editorial-footer-bottom">
        <span>© 2026 Mantel.</span>
        <span>Pickup at the counter</span>
        <span>Kingdom of Bahrain</span>
      </div>
    </footer>
  );
}
