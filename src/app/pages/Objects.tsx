import { useState } from "react";
import type { MenuCategory, Page } from "@/app/types";
import retailCandleSticksImage from "@/imports/retail-candle-sticks.png";
import coffeeCollageImage from "@/imports/mood-coffee-collage.jpg";
import retailLighterImage from "@/imports/retail-lighter.png";
import retailCandleImage from "@/imports/retail-candle.png";
import retailMatchaImage from "@/imports/retail-matcha.png";
import retailMatchSticksImage from "@/imports/retail-match-sticks.png";

type Props = {
  linkTo: (page: Page, category?: MenuCategory) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
};

type RetailProduct = {
  name: string;
  description: string;
  price: string;
  image: string;
  tone: string;
};

const RETAIL_PRODUCTS: RetailProduct[] = [
  {
    name: "Matcha Powder",
    description: "Bright, clean, and quietly grassy.",
    price: "BD 4.500",
    image: retailMatchaImage,
    tone: "matcha",
  },
  {
    name: "Candles",
    description: "A soft light for the end of the day.",
    price: "BD 7.000",
    image: retailCandleImage,
    tone: "candle",
  },
  {
    name: "Candle Sticks",
    description: "For the shelf, the table, and the in-between.",
    price: "BD 5.500",
    image: retailCandleSticksImage,
    tone: "sticks",
  },
  {
    name: "Lighters",
    description: "A small object with a little ceremony.",
    price: "BD 3.000",
    image: retailLighterImage,
    tone: "lighter",
  },
  {
    name: "Match Sticks",
    description: "A little fire for the everyday ritual.",
    price: "BD 2.500",
    image: retailMatchSticksImage,
    tone: "matches",
  },
  {
    name: "Custom Bags",
    description: "Made for the things you take with you.",
    price: "BD 6.500",
    image: coffeeCollageImage,
    tone: "bag",
  },
];

export function Objects({ linkTo }: Props) {
  const [bag, setBag] = useState<Record<string, boolean>>({});
  const addedCount = Object.values(bag).filter(Boolean).length;

  const toggleBag = (name: string) => {
    setBag((current) => ({ ...current, [name]: !current[name] }));
  };

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

      <div className="editorial-objects-status" aria-live="polite">
        {addedCount > 0 ? `${addedCount} item${addedCount === 1 ? "" : "s"} in your bag` : "Collect in store · Bahrain"}
      </div>

      <section className="editorial-objects-grid" aria-label="Mantel objects">
        {RETAIL_PRODUCTS.map((product) => {
          const added = Boolean(bag[product.name]);
          return (
            <article key={product.name} className={`editorial-object-card editorial-object-card-${product.tone}`}>
              <div className="editorial-object-image">
                <img src={product.image} alt={`${product.name} placeholder`} loading="lazy" />
                <span className="editorial-object-placeholder">Placeholder</span>
              </div>
              <div className="editorial-object-info">
                <div>
                  <h2>{product.name}</h2>
                  <p>{product.description}</p>
                </div>
                <div className="editorial-object-purchase">
                  <span>{product.price}</span>
                  <button type="button" onClick={() => toggleBag(product.name)} aria-pressed={added}>
                    {added ? "Added" : "Add to bag +"}
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
