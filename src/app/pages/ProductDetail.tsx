import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MenuCategory, Page } from "@/app/types";
import { formatBhd, type CartLine, type RetailProduct } from "@/app/content/retail";
import { ObjectSlides } from "@/app/components/objects/ObjectSlides";

/*
 * One object's own page: /objects/<id>. Reached from the Objects shelf by
 * clicking a card's image or name (Objects.tsx) — the shelf itself stays a
 * grid, this is where a single product gets the room a tin of candles or a
 * printed tote actually needs: its own photograph, its own accordion.
 */

type Props = {
  linkTo: (page: Page, category?: MenuCategory, objectSlug?: string | null) => {
    href: string;
    onClick: (event: React.MouseEvent) => void;
  };
  product: RetailProduct;
  cartLines: CartLine[];
  onAdd: (product: RetailProduct) => void;
};

export function ProductDetail({ linkTo, product, cartLines, onAdd }: Props) {
  const line = cartLines.find((entry) => entry.product.id === product.id);
  const quantity = line?.quantity ?? 0;

  return (
    <div className="editorial-retail-detail-page">
      <nav className="editorial-retail-detail-breadcrumb" aria-label="Breadcrumb">
        <a {...linkTo("objects")}>Retail</a>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{product.name}</span>
      </nav>

      <div className="editorial-retail-detail-image">
        <ObjectSlides images={product.images ?? [product.image]} alt={product.name} zoomable />
      </div>

      <div className="editorial-retail-detail-info">
        <h1>{product.name}</h1>
        <p className="editorial-retail-detail-description">{product.description}</p>
        <p className="editorial-retail-detail-price">{formatBhd(product.price)}</p>

        <button
          type="button"
          className="editorial-retail-detail-add"
          onClick={() => onAdd(product)}
          disabled={!product.backendId}
        >
          {!product.backendId
            ? "Loading…"
            : quantity > 0
              ? `Add another — ${formatBhd(product.price)} · ${quantity} in bag`
              : `Add to bag — ${formatBhd(product.price)}`}
        </button>

        <ProductAccordion product={product} />

        <a {...linkTo("objects")} className="editorial-retail-detail-back">
          ← Back to Objects
        </a>
      </div>
    </div>
  );
}

const SECTIONS = ["object", "care", "collection"] as const;
type SectionKey = (typeof SECTIONS)[number];

const SECTION_LABEL: Record<SectionKey, string> = {
  object: "The Object",
  care: "Care",
  collection: "Collection",
};

function ProductAccordion({ product }: { product: RetailProduct }) {
  /* The Object opens by default — it is the one line every visitor came to
     read; Care and Collection are there for whoever wants more. */
  const [open, setOpen] = useState<SectionKey | null>("object");
  const body: Record<SectionKey, string> = {
    object: product.story,
    care: product.care,
    collection: product.collection,
  };

  return (
    <div className="editorial-retail-detail-accordion">
      {SECTIONS.map((key) => (
        <div key={key} className="editorial-retail-detail-accordion-row">
          <button
            type="button"
            onClick={() => setOpen((current) => (current === key ? null : key))}
            aria-expanded={open === key}
          >
            <span>{SECTION_LABEL[key]}</span>
            <ChevronDown
              size={14}
              strokeWidth={1.5}
              className={`editorial-retail-detail-accordion-chevron ${open === key ? "is-open" : ""}`}
              aria-hidden="true"
            />
          </button>
          {open === key && <p>{body[key]}</p>}
        </div>
      ))}
    </div>
  );
}
