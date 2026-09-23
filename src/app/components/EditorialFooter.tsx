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
        </div>

        <div>
          <p className="editorial-footer-title">Legal Information</p>
          <a {...linkTo("terms")} className="editorial-footer-link">Terms</a>
          <a {...linkTo("privacy")} className="editorial-footer-link">Privacy</a>
        </div>

        <div className="editorial-footer-instagram">
          <a
            className="editorial-footer-social"
            href="https://www.instagram.com/bymantel?igsi=MTk3NDhxZGVuNWFucA=="
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
