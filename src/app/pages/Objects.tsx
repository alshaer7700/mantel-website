import type { MenuCategory, Page } from "@/app/types";
import { formatBhd, type CartLine, type RetailProduct } from "@/app/content/retail";
import { ObjectSlides } from "@/app/components/objects/ObjectSlides";

type Props = {
  linkTo: (page: Page, category?: MenuCategory) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
  products: RetailProduct[];
  loading: boolean;
  error: boolean;
  cartLines: CartLine[];
  onAdd: (product: RetailProduct) => void;
};

export function Objects({ linkTo, products, loading, error, cartLines, onAdd }: Props) {
  const itemCount = cartLines.reduce((total, line) => total + line.quantity, 0);

  return (
    <div className="editorial-objects-page">
      <header className="editorial-objects-intro">
        <div>
          <p className="editorial-overline">01 — Retail / small editions</p>
          <h1>Objects.</h1>
        </div>
        <div className="editorial-objects-intro-copy">
          <p>
            A considered shelf of things for the ritual around the coffee. Five small objects,
            chosen to be used and kept.
          </p>
          <a {...linkTo("home")} className="editorial-link">Back to Mantel</a>
        </div>
      </header>

      {/* The ledger rides the hairline that opens the shelf: what is on it on
          the left, what the shelf is doing on the right. */}
      <div className="editorial-objects-ledger">
        {/* Just the count. "Small editions" is already the overline directly
            above it, and saying it twice is half of what makes a masthead
            noisy. */}
        <span>
          {products.length} object{products.length === 1 ? "" : "s"}
        </span>
        <span aria-live="polite">
          {loading
            ? "Refreshing the shelf…"
            : error
              ? "Showing the last known shelf · Bahrain"
              : itemCount > 0
                ? `${itemCount} item${itemCount === 1 ? "" : "s"} in your bag`
                : "Collect in store · Bahrain"}
        </span>
      </div>

      <section className="editorial-objects-grid" aria-label="Mantel objects" aria-busy={loading}>
        {products.map((product, index) => {
          const line = cartLines.find((entry) => entry.product.id === product.id);
          const quantity = line?.quantity ?? 0;
          return (
            <article key={product.id} className={`editorial-object-card editorial-object-card-${product.tone}`}>
              <div className="editorial-object-image">
                {/* Margiela numbers everything. Decoration, not content, so it
                    is hidden from the reading order. */}
                <span className="editorial-object-index" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <ObjectSlides images={product.images ?? [product.image]} alt={product.name} />
              </div>
              <div className="editorial-object-info">
                <div>
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>
                </div>
                <div className="editorial-object-purchase">
                  <span>{formatBhd(product.price)}</span>
                  <button
                    type="button"
                    onClick={() => onAdd(product)}
                    disabled={loading || !product.backendId}
                    aria-label={`Add ${product.name} to cart`}
                  >
                    {loading ? "Loading…" : quantity > 0 ? `Add another · ${quantity}` : "Add to bag +"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
