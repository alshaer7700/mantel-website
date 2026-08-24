import type { MenuCategory, Page } from "@/app/types";

type Props = {
  linkTo: (page: Page, category?: MenuCategory) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
};

const socialLinks = [
  { label: "ig", href: "https://www.instagram.com/bymantel/", name: "Instagram" },
  { label: "x", href: "https://twitter.com/", name: "X" },
  { label: "yt", href: "https://www.youtube.com/", name: "YouTube" },
  { label: "pin", href: "https://www.pinterest.com/", name: "Pinterest" },
  { label: "ln", href: "https://www.linkedin.com/", name: "LinkedIn" },
];

export function EditorialFooter({ linkTo }: Props) {
  return (
    <footer className="editorial-footer" id="footer">
      <div className="editorial-footer-grid">
        <div>
          <p className="editorial-footer-title">Client care</p>
          <a {...linkTo("contact")} className="editorial-footer-link">Contact us</a>
          <a {...linkTo("faq")} className="editorial-footer-link">FAQs</a>
          <a href="#packaging" className="editorial-footer-link">Packaging</a>
          <a href="#returns" className="editorial-footer-link">Return form</a>
          <a href="#shipping" className="editorial-footer-link">Shipping</a>
          <a href="#boutiques" className="editorial-footer-link">Boutiques</a>
          <a href="tel:+9733170385098" className="editorial-footer-link">Call us: +973 3170 385098</a>
        </div>

        <div>
          <p className="editorial-footer-title">Legal information</p>
          <a {...linkTo("terms")} className="editorial-footer-link">Terms</a>
          <a {...linkTo("privacy")} className="editorial-footer-link">Privacy</a>
          <a href="#cookie-policy" className="editorial-footer-link">Cookie</a>
          <a href="#accessibility" className="editorial-footer-link">Accessibility statement</a>
        </div>

        <div className="editorial-footer-aside">
          <div>
            <p className="editorial-footer-title">Visit Mantel</p>
            <p>Hidd, Kingdom of Bahrain<br />A shelf for the everyday.</p>
          </div>
          <div>
            <p className="editorial-footer-title">Follow us</p>
            <div className="editorial-footer-socials">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  className="editorial-footer-social"
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.name}
                >
                  {social.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="editorial-footer-bottom">
        <span>Mantel. · Hidd, Bahrain</span>
        <span>© 2026 Mantel. All rights reserved.</span>
      </div>
    </footer>
  );
}
