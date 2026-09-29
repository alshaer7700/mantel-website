import { useEffect, useRef, useState } from "react";
import { Instagram, X } from "lucide-react";
import { useDialogFocus } from "@/app/hooks/useDialogFocus";
import type { Announcement, Popup } from "@/lib/api/site";

/*
 * The three things staff can put on the website from Shop settings: a line
 * across the top, a one-time popup, and a "back soon" page. Each is off until
 * someone turns it on in the dashboard, and each renders nothing when the
 * settings can't be read.
 */

function isExternal(url: string) {
  return /^https?:\/\//i.test(url) && !url.startsWith(window.location.origin);
}

function NoticeLink({ url, label, className }: { url: string; label: string; className: string }) {
  if (!url) return null;
  return (
    <a className={className} href={url} {...(isExternal(url) ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {label || "Find out more"}
    </a>
  );
}

/*
 * Sits in the page flow directly under the fixed header. The wrapper takes
 * the header's height as padding and gives it back as a negative margin, so
 * every page's own `paddingTop: navHeight` still lands in the right place —
 * the pages don't need to know the bar exists.
 */
export function AnnouncementBar({ announcement, navHeight }: { announcement: Announcement; navHeight: string }) {
  return (
    <div style={{ paddingTop: navHeight, marginBottom: `-${navHeight}` }}>
      <div className="site-announcement" role="region" aria-label="Announcement">
        <span>{announcement.text}</span>
        <NoticeLink url={announcement.link_url} label={announcement.link_label} className="site-announcement-link" />
      </div>
    </div>
  );
}

const POPUP_SEEN_KEY = "mantel-popup-seen";

function seenVersion(): number {
  try {
    return Number(window.localStorage.getItem(POPUP_SEEN_KEY) ?? 0);
  } catch {
    return 0;
  }
}

/** Once per visitor per version: saving the popup in the dashboard bumps the version. */
export function SitePopup({ popup }: { popup: Popup }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* Waits for the cookie notice on the home page to be answered, so the two
     never stack on top of each other. */
  useEffect(() => {
    if (seenVersion() >= popup.version) return;
    let clearFor = 0;
    const timer = window.setInterval(() => {
      clearFor = document.querySelector(".editorial-cookie-dialog") ? 0 : clearFor + 1;
      if (clearFor >= 2) {
        window.clearInterval(timer);
        setOpen(true);
      }
    }, 600);
    return () => window.clearInterval(timer);
  }, [popup.version]);

  const close = () => {
    setOpen(false);
    try {
      window.localStorage.setItem(POPUP_SEEN_KEY, String(popup.version));
    } catch {
      /* Private mode: it may show again next visit, which is harmless. */
    }
  };

  useDialogFocus(open, ref, close);

  if (!open) return null;
  return (
    <div className="site-popup-backdrop" onClick={close}>
      <div
        ref={ref}
        className="site-popup"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-popup-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="site-popup-close" onClick={close} aria-label="Close">
          <X size={18} strokeWidth={1.4} />
        </button>
        {popup.image && <img className="site-popup-image" src={popup.image} alt="" />}
        <div className="site-popup-text">
          <h2 id="site-popup-title">{popup.title}</h2>
          {popup.body && <p>{popup.body}</p>}
          <NoticeLink url={popup.link_url} label={popup.link_label} className="site-popup-link" />
        </div>
      </div>
    </div>
  );
}

export function MaintenancePage({ message }: { message: string }) {
  return (
    <main id="main-content" className="site-maintenance">
      <p className="site-maintenance-mark">Mantel.</p>
      <h1>{message || "We're making a few changes. Back very soon."}</h1>
      <p>In the meantime, the café is open as usual in Hidd.</p>
      <a href="https://www.instagram.com/bymantel" target="_blank" rel="noopener noreferrer" aria-label="Mantel on Instagram">
        <Instagram size={18} strokeWidth={1.4} />
        <span>@bymantel</span>
      </a>
    </main>
  );
}
