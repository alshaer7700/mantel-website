import { useEffect, useState } from "react";

/*
 * The image slot on a retail card, for products that have more than one face.
 *
 * The tote is the reason this exists: one side carries "Mantel.", the other a
 * red heart, and a shelf that shows only one of them is selling half the bag.
 *
 * It is a slot, not a carousel — no autoplay controls, no arrows, no library.
 * Products here have two faces at most, so the faces turn over on their own on
 * a slow beat and the whole control is a row of dots under the object. Nobody
 * has to touch the photograph to find out there is a second side to it, which
 * is the point: on a phone there is no hover to hint at one.
 *
 * Everything stays mounted and crossfades, which also means the second face is
 * already decoded by the time it is shown. Picking a dot stops the turn — once
 * someone has chosen a face, moving it under them is rude.
 *
 * A product with one image renders exactly the <img> the card rendered before,
 * with no dots and nothing that moves.
 */

type Props = {
  images: readonly string[];
  alt: string;
};

/** Long enough to read as a considered turn rather than a flicker. */
const TURN_MS = 3800;

export function ObjectSlides({ images, alt }: Props) {
  const [shown, setShown] = useState(0);
  /* Set once a dot is used: from then on the slot is the visitor's. */
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (images.length < 2 || held) return;
    /* Asking for less motion means less motion, not a different interval. */
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const turn = window.setInterval(
      () => setShown((i) => (i + 1) % images.length),
      TURN_MS,
    );
    return () => window.clearInterval(turn);
  }, [images.length, held]);

  if (images.length < 2) {
    return <img src={images[0]} alt={alt} loading="lazy" />;
  }

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
        />
      ))}

      <div className="editorial-object-dots">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => {
              setShown(i);
              setHeld(true);
            }}
            aria-label={`${alt}, view ${i + 1} of ${images.length}`}
            aria-current={i === shown}
            data-shown={i === shown ? "" : undefined}
          />
        ))}
      </div>
    </>
  );
}
