import { useEffect, useState } from "react";
import { fetchMyLoyalty, walletPageUrl, type MyLoyalty } from "@/lib/api/loyalty";

/*
 * The customer's stamp card in their account, by the mobile saved above
 * (supabase/038, my_loyalty). Nothing shows while the stamp card is off.
 * `phoneKey` is the saved mobile, so saving a new one reloads the card.
 */
export function StampCardBlock({ phoneKey }: { phoneKey: string }) {
  const [card, setCard] = useState<MyLoyalty | null>(null);

  useEffect(() => {
    let live = true;
    fetchMyLoyalty().then((r) => {
      if (live && r.ok) setCard(r.value);
    });
    return () => {
      live = false;
    };
  }, [phoneKey]);

  if (!card) return null;
  if (card.needs_phone) {
    return (
      <div className="editorial-account-stamps">
        <p className="editorial-account-stamps-title">Stamp card</p>
        <p className="editorial-account-hint">
          Add your mobile above and save: it becomes your stamp card. Every order is a stamp, and {card.stamps_needed} stamps get you {card.reward.charAt(0).toLowerCase()}{card.reward.slice(1)}.
        </p>
      </div>
    );
  }
  const filled = Math.min(card.stamps, card.needed);
  return (
    <div className="editorial-account-stamps">
      <p className="editorial-account-stamps-title">Stamp card · {filled} of {card.needed}</p>
      <div className="editorial-stamps" role="img" aria-label={`${filled} of ${card.needed} stamps`}>
        {Array.from({ length: card.needed }, (_, i) => (
          <span key={i} className={`editorial-stamp${i < filled ? " is-on" : ""}${i === card.needed - 1 ? " is-reward" : ""}`} />
        ))}
      </div>
      <p className="editorial-account-hint">
        {card.stamps >= card.needed ? `Your reward is waiting at the counter: ${card.reward}.` : `${card.needed - card.stamps} more for: ${card.reward}.`}{" "}
        <a href={walletPageUrl(card.pass_token)} className="editorial-link">Add to Apple Wallet</a>
      </p>
    </div>
  );
}
