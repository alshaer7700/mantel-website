import { useState } from "react";

/*
 * The image slot on a retail card, for products that have more than one face.
 *
 * The tote is the reason this exists: one side carries "Mantel.", the other a
 * red heart, and a shelf that shows only one of them is selling half the bag.
 *
 * It is a slot, not a carousel — no autoplay, no arrows, no library. Products
 * here have two faces at most, so the whole control is a row of dots under the
 * object, and the object itself advances on click. Everything stays mounted and
 * crossfades, which also means the second face is already decoded by the time
 * anyone asks for it.
 *
 * A product with one image renders exactly the <img> the card rendered before,
 * with no dots and nothing to click.
 */

type Props = {
  images: readonly string[];
  alt: string;
};

export function ObjectSlides({ images, alt }: Props) {
  const [shown, setShown] = useState(0);

  if (images.length < 2) {
    return <img src={images[0]} alt={alt} loading="lazy" />;
  }

  const advance = () => setShown((i) => (i + 1) % images.length);

  return (
    <>
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={alt}
          loading="lazy"
          /* Only the visible face is announced; the others are decoration
             until they are the one on top. */
          aria-hidden={i !== shown}
          className="editorial-object-slide"
          data-shown={i === shown ? "" : undefined}
          onClick={advance}
        />
      ))}

      <div className="editorial-object-dots">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setShown(i)}
            aria-label={`${alt}, view ${i + 1} of ${images.length}`}
            aria-current={i === shown}
            data-shown={i === shown ? "" : undefined}
          />
        ))}
      </div>
    </>
  );
}
