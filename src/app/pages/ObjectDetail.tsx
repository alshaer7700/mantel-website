import { useState } from "react";
import type { MenuCategory, Page } from "@/app/types";
import { formatBhd, type CartLine, type RetailProduct } from "@/app/content/retail";
import { ObjectSlides } from "@/app/components/objects/ObjectSlides";

/*
 * One object, on its own page.
 *
 * Until now the shelf was the whole of retail: five cards, each with a name, a
 * line of copy and a price, and no way to look closer at any of them. Every
 * store this design direction borrows from gives a product a page — the object
 * large, the detail folded into rows you open if you want them, and one action
 * that stays put. So does this.
 *
 * What goes in the folds is what someone at the counter actually asks: what it
 * is, how to look after it, and how they get it. Nothing is invented for the
 * sake of filling a row — a product without care copy simply has one fewer.
 */

type Props = {
  product: RetailProduct | undefined;
  linkTo: (page: Page, category?: MenuCategory, objectId?: string | null) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
  cartLines: CartLine[];
  onAdd: (product: RetailProduct) => void;
  loading: boolean;
};

export function ObjectDetail({ product, linkTo, cartLines, onAdd, loading }: Props) {
  /*
   * An id that matches nothing — a stale link, a typo, a product taken off the
   * shelf. The shelf is one tap away and says more than an error page would.
   * While the catalogue is still loading there is nothing to say yet, so the
   * frame stays quiet rather than flashing "not found" at someone whose
   * product is about to arrive.
   */
  if (!product) {
    return (
      <div className="editorial-object-page editorial-object-page-empty">
        {!loading && (
          <>
            <p className="editorial-overline">Not on the shelf</p>
            <h1>That object isn't here.</h1>
            <a {...linkTo("objects")} className="editorial-link">See the shelf</a>
          </>
        )}
      </div>
    );
  }

  const quantity = cartLines.find((line) => line.product.id === product.id)?.quantity ?? 0;

  return (
    <div className="editorial-object-page">
      <nav className="editorial-object-crumbs" aria-label="Breadcrumb">
        <a {...linkTo("objects")}>Retail</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="editorial-object-layout">
        <div className="editorial-object-stage">
          <ObjectSlides images={product.images ?? [product.image]} alt={product.name} />
        </div>

        <div className="editorial-object-panel">
          <h1>{product.name}</h1>
          <p className="editorial-object-standfirst">{product.description}</p>
          <p className="editorial-object-price">{formatBhd(product.price)}</p>

          <button
            type="button"
            className="editorial-object-add"
            onClick={() => onAdd(product)}
            disabled={loading || !product.backendId}
          >
            {loading
              ? "Loading…"
              : quantity > 0
                ? `Add another — ${formatBhd(product.price)}`
                : `Add to bag — ${formatBhd(product.price)}`}
          </button>
          {quantity > 0 && (
            <p className="editorial-object-inbag" aria-live="polite">
              {quantity} in your bag
            </p>
          )}

          <div className="editorial-object-folds">
            {FOLDS[product.id]?.map((fold, index) => (
              <Fold key={fold.title} {...fold} open={index === 0} />
            ))}
            <Fold
              title="Collection"
              body="Collect at the counter in Hidd. Bring the name on your order; nothing is posted."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Fold({ title, body, open = false }: { title: string; body: string; open?: boolean }) {
  const [shown, setShown] = useState(open);

  return (
    <div className="editorial-object-fold" data-open={shown ? "" : undefined}>
      <button type="button" onClick={() => setShown((v) => !v)} aria-expanded={shown}>
        <span>{title}</span>
        {/* The mark is decoration: the button already announces its state. */}
        <span aria-hidden="true">{shown ? "−" : "+"}</span>
      </button>
      {shown && <p>{body}</p>}
    </div>
  );
}

/*
 * Per-product copy, keyed by the id in content/retail.ts.
 *
 * Here rather than in the database because it is editorial writing about five
 * fixed objects, not catalogue data: the shelf reads price, name and photograph
 * from Supabase, and this is the paragraph a person wrote to sit beside them.
 * A product with no entry gets the collection row alone.
 */
const FOLDS: Record<string, { title: string; body: string }[]> = {
  candles: [
    {
      title: "The object",
      body: "Soy wax in a stamped tin, poured in small batches. Warm wood and dry smoke — the room after the counter closes.",
    },
    {
      title: "Care",
      body: "Trim the wick before each light. First burn until the pool reaches the edge, or it will tunnel and never come back.",
    },
  ],
  "candle-sticks": [
    {
      title: "The object",
      body: "A pair of cream tapers, banded in corrugated paper with a small red heart. Unscented, so they sit under dinner rather than over it.",
    },
    { title: "Care", body: "Standard taper fitting. Keep them out of a draught and they burn straight." },
  ],
  lighters: [
    {
      title: "The object",
      body: "A refillable lighter in two colourways — leopard and checkerboard — each carrying the Mantel script.",
    },
    { title: "Care", body: "Refillable with standard butane. Keep it out of the sun and out of the car." },
  ],
  "match-sticks": [
    {
      title: "The object",
      body: "Safety matches in a Mantel box, printed as a record card: provenance, composition, and what it is for.",
    },
  ],
  "custom-bags": [
    {
      title: "The object",
      body: "Heavy cotton tote, printed both sides — \"Mantel.\" on one, the red heart on the other. Made for the things you take with you.",
    },
    { title: "Care", body: "Cold wash, inside out, and let it dry flat. The print does not like a tumble dryer." },
  ],
};
