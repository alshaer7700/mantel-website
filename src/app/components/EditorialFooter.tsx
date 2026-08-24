import { Instagram } from "lucide-react";
import type { MenuCategory, Page } from "@/app/types";

type Props = {
  linkTo: (page: Page, category?: MenuCategory) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
};

export function EditorialFooter({ linkTo }: Props) {
  return (
    <footer className="editorial-footer" id="footer">
      <div className="editorial-footer-grid">
        <div>
          <p className="editorial-footer-title">Client Care</p>
          <a {...linkTo("contact")} className="editorial-footer-link">Contact us</a>
          <a {...linkTo("faq")} className="editorial-footer-link">FAQs</a>
          <a href="#packaging" className="editorial-footer-link">Packaging</a>
          <a href="#returns" className="editorial-footer-link">Return form</a>
          <a href="#shipping" className="editorial-footer-link">Shipping</a>
          <a href="#boutiques" className="editorial-footer-link">Boutiques</a>
          <a href="tel:+9733170385098" className="editorial-footer-link">Call us: +973 3170 385098</a>
        </div>

        <div>
          <p className="editorial-footer-title">Legal Information</p>
          <a {...linkTo("terms")} className="editorial-footer-link">Terms</a>
          <a {...linkTo("privacy")} className="editorial-footer-link">Privacy</a>
          <a href="#cookie-policy" className="editorial-footer-link">Cookie</a>
          <a href="#accessibility" className="editorial-footer-link">Accessibility Statement</a>
        </div>

        <div className="editorial-footer-instagram">
          <a
            className="editorial-footer-social"
            href="https://www.instagram.com/mantelbh/"
            target="_blank"
            rel="noreferrer"
            aria-label="Mantel on Instagram"
          >
            <Instagram size={15} strokeWidth={1.4} aria-hidden="true" />
          </a>
        </div>
      </div>

      <div className="editorial-footer-bottom">
        <span>© 2026 MANTEL.</span>
      </div>
    </footer>
  );
}
