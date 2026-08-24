import type { MenuCategory, Page } from "@/app/types";
import { formatBhd, type CartLine, type RetailProduct } from "@/app/content/retail";

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
            A considered shelf of things for the ritual around the coffee. Six small objects,
            chosen to be used and kept.
          </p>
          <a {...linkTo("home")} className="editorial-link">Back to Mantel</a>
        </div>
      </header>

      <div className="editorial-objects-status" aria-live="polite">
        {loading
          ? "Refreshing the shelf…"
          : error
            ? "Showing the last known shelf · Bahrain"
            : itemCount > 0
              ? `${itemCount} item${itemCount === 1 ? "" : "s"} in your bag`
              : "Collect in store · Bahrain"}
      </div>

      <section className="editorial-objects-grid" aria-label="Mantel objects" aria-busy={loading}>
        {products.map((product) => {
          const line = cartLines.find((entry) => entry.product.id === product.id);
          const quantity = line?.quantity ?? 0;
          return (
            <article key={product.id} className={`editorial-object-card editorial-object-card-${product.tone}`}>
              <div className="editorial-object-image">
                <img src={product.image} alt={product.name} loading="lazy" />
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
