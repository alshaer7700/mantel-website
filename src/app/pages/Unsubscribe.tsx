import { useEffect, useState } from "react";
import type { MenuCategory, Page } from "@/app/types";
import { formErrorMessage, unsubscribeNewsletter } from "@/lib/api/forms";

type Props = {
  linkTo: (page: Page, category?: MenuCategory) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
};

/*
 * Where "Unsubscribe" at the bottom of a newsletter lands. It acts on
 * arrival: the link carries the subscriber's private token, so there's
 * nothing to fill in and no second button to miss.
 */
export function Unsubscribe({ linkTo }: Props) {
  const [state, setState] = useState<{ kind: "working" } | { kind: "done"; email: string } | { kind: "invalid" } | { kind: "error"; message: string }>({ kind: "working" });

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("t") ?? "";
    let live = true;
    unsubscribeNewsletter(token).then((r) => {
      if (!live) return;
      if (!r.ok) setState({ kind: "error", message: formErrorMessage(r.error) });
      else setState(r.value ? { kind: "done", email: r.value.email } : { kind: "invalid" });
    });
    return () => {
      live = false;
    };
  }, []);

  return (
    <div className="editorial-soon">
      <p className="editorial-overline">Newsletter</p>
      {state.kind === "working" && <h1>One moment…</h1>}
      {state.kind === "done" && (
        <>
          <h1>You're unsubscribed.</h1>
          <p className="editorial-soon-copy">
            {state.email ? `${state.email} won't get the Mantel newsletter any more.` : "You won't get the Mantel newsletter any more."}{" "}
            Changed your mind? You can sign up again at the bottom of the home page.
          </p>
        </>
      )}
      {state.kind === "invalid" && (
        <>
          <h1>This link doesn't work.</h1>
          <p className="editorial-soon-copy">
            It may be from a test email, or copied only in part. To stop the newsletter, reply to any of our emails
            or write to hello@bymantel.com and we'll take you off the list.
          </p>
        </>
      )}
      {state.kind === "error" && (
        <>
          <h1>That didn't go through.</h1>
          <p className="editorial-soon-copy">{state.message}</p>
        </>
      )}
      <div className="editorial-inline-links">
        <a {...linkTo("home")} className="editorial-link">Back to Mantel</a>
      </div>
    </div>
  );
}
