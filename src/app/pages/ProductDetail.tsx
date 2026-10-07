import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { MenuCategory, Page } from "@/app/types";
import { formatBhd, type CartLine, type RetailProduct } from "@/app/content/retail";
import { ObjectSlides } from "@/app/components/objects/ObjectSlides";
import { Styled } from "@/app/components/Styled";
import { Spin360 } from "@/app/components/objects/Spin360";

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
        {product.spin ? (
          <Spin360 frames={product.spin} alt={product.name} autoplay />
        ) : (
          <ObjectSlides images={product.images ?? [product.image]} alt={product.name} zoomable />
        )}
      </div>

      <div className="editorial-retail-detail-info">
        <h1><Styled styles={product.styles} field="name">{product.name}</Styled></h1>
        <p className="editorial-retail-detail-description"><Styled styles={product.styles} field="description">{product.description}</Styled></p>
        <p className="editorial-retail-detail-price">{formatBhd(product.price)}</p>

        <button
          type="button"
          className="editorial-retail-detail-add"
          onClick={() => onAdd(product)}
          disabled={!product.backendId || product.soldOut}
        >
          {!product.backendId
            ? "Loading…"
            : product.soldOut
              ? "Sold out"
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
  const body: Record<SectionKey, string> = {
    object: product.story,
    care: product.care,
    collection: product.collection,
  };
  /* A product added in the dashboard may leave a section blank: skip it
     rather than show a heading that opens onto nothing. */
  const shown = SECTIONS.filter((key) => body[key]?.trim());
  const [open, setOpen] = useState<SectionKey | null>(shown[0] ?? null);

  if (!shown.length) return null;
  return (
    <div className="editorial-retail-detail-accordion">
      {shown.map((key) => (
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
          {open === key && <p><Styled styles={product.styles} field={key === "object" ? "story" : key}>{body[key]}</Styled></p>}
        </div>
      ))}
    </div>
  );
}
