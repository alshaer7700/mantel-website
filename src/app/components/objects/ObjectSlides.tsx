import { useState } from "react";

/*
 * The image slot on a retail card, for products that have more than one face.
 *
 * The tote is the reason this exists: one side carries "Mantel.", the other a
 * red heart, and a shelf that shows only one of them is selling half the bag.
 *
 * A real flip, not a crossfade: the two faces sit back to back in 3D and the
 * whole card turns, the way the object itself would in a hand. Products here
 * have two faces at most (see retail.ts), so the flip only ever needs a front
 * and a back — a third face would need a different control, not a third side
 * of the same card.
 *
 * A product with one image renders exactly the <img> the card rendered before,
 * with no dots and nothing to click.
 *
 * The image sits inside a link to the product's own page (Objects.tsx), so
 * flipping has to stop the click there rather than let it bubble into the
 * anchor and navigate away mid-browse.
 */

type Props = {
  images: readonly string[];
  alt: string;
};

export function ObjectSlides({ images, alt }: Props) {
  const [flipped, setFlipped] = useState(false);

  if (images.length < 2) {
    return <img src={images[0]} alt={alt} loading="lazy" />;
  }

  const toggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setFlipped((f) => !f);
  };

  return (
    <>
      <div className="editorial-object-flip" data-flipped={flipped ? "" : undefined} onClick={toggle}>
        <img
          src={images[0]}
          alt={alt}
          loading="lazy"
          aria-hidden={flipped}
          className="editorial-object-slide editorial-object-slide-front"
        />
        <img
          src={images[1]}
          alt={alt}
          loading="lazy"
          aria-hidden={!flipped}
          className="editorial-object-slide editorial-object-slide-back"
        />
      </div>

      <div className="editorial-object-dots">
        {images.slice(0, 2).map((src, i) => {
          const isBack = i === 1;
          return (
            <button
              key={src}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setFlipped(isBack);
              }}
              aria-label={`${alt}, view ${i + 1} of ${images.length}`}
              aria-current={isBack === flipped}
              data-shown={isBack === flipped ? "" : undefined}
            />
          );
        })}
      </div>
    </>
  );
}
