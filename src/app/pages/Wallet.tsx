import { useEffect, useState } from "react";
import type { MenuCategory, Page } from "@/app/types";
import { formErrorMessage } from "@/lib/api/forms";
import { fetchWalletCard, walletPassUrl, type StampCard } from "@/lib/api/loyalty";

type Props = {
  linkTo: (page: Page, category?: MenuCategory) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
};

/*
 * A customer's stamp card, from its private link (/wallet?t=token): the
 * counter's QR code, a WhatsApp message, or the back of the Apple Wallet pass
 * all land here. It shows the live count, and on an iPhone offers the pass.
 */
export function Wallet({ linkTo }: Props) {
  const token = new URLSearchParams(window.location.search).get("t") ?? "";
  const [state, setState] = useState<{ kind: "loading" } | { kind: "card"; card: StampCard } | { kind: "invalid" } | { kind: "error"; message: string }>({ kind: "loading" });
  const [walletReady, setWalletReady] = useState(false);

  useEffect(() => {
    let live = true;
    fetchWalletCard(token).then((r) => {
      if (!live) return;
      if (!r.ok) setState({ kind: "error", message: formErrorMessage(r.error) });
      else setState(r.value ? { kind: "card", card: r.value } : { kind: "invalid" });
    });
    /* The pass needs Mantel's Apple certificate; until it's set, don't offer
       a button that can only fail. */
    fetch("/wallet-pass", { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"status":true}' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => {
        if (live) setWalletReady(Boolean(body?.ready));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [token]);

  if (state.kind !== "card") {
    return (
      <div className="editorial-soon">
        <p className="editorial-overline">Stamp card</p>
        {state.kind === "loading" && <h1>One moment…</h1>}
        {state.kind === "invalid" && (
          <>
            <h1>This link doesn't work.</h1>
            <p className="editorial-soon-copy">It may have been copied only in part. Ask at the counter and we'll send it again.</p>
          </>
        )}
        {state.kind === "error" && (
          <>
            <h1>That didn't load.</h1>
            <p className="editorial-soon-copy">{state.message}</p>
          </>
        )}
        <div className="editorial-inline-links">
          <a {...linkTo("home")} className="editorial-link">Back to Mantel</a>
        </div>
      </div>
    );
  }

  const { card } = state;
  const filled = Math.min(card.stamps, card.needed);
  const full = card.stamps >= card.needed;
  return (
    <div className="editorial-soon">
      <p className="editorial-overline">Stamp card</p>
      <h1>{card.name ? `${card.name.split(" ")[0]}'s card.` : "Your card."}</h1>
      <div className="editorial-stamps" role="img" aria-label={`${filled} of ${card.needed} stamps`}>
        {Array.from({ length: card.needed }, (_, i) => (
          <span key={i} className={`editorial-stamp${i < filled ? " is-on" : ""}${i === card.needed - 1 ? " is-reward" : ""}`} />
        ))}
      </div>
      <p className="editorial-soon-copy">
        {full
          ? `Your card is full, and your reward is waiting at the counter: ${card.reward}.`
          : `${filled} of ${card.needed} stamps. ${card.needed - card.stamps} more for your reward: ${card.reward}.`}
      </p>
      <p className="editorial-soon-copy">
        Every order collects a stamp. At the counter, show this card or say your mobile number ({card.phone}).
      </p>
      {walletReady && (
        <a className="editorial-wallet-button" href={walletPassUrl(token)}>
          Add to Apple Wallet
        </a>
      )}
      <div className="editorial-inline-links">
        <a {...linkTo("menu")} className="editorial-link">See the menu</a>
      </div>
    </div>
  );
}
