import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/*
 * The image slot on a retail card, for products that have more than one face.
 *
 * Every product with two or more faces gets the same control: a swipeable
 * track, with a pair of arrow buttons for a pointer that doesn't drag and the
 * dots for aim. This used to give exactly-two-face products (the tote, the
 * lighter) a 3D card flip instead — dropped in favour of one interaction
 * that behaves the same everywhere, rather than a flip on some cards and a
 * swipe on others.
 *
 * A product with one image renders exactly the <img> the card rendered
 * before, with no dots and nothing to click.
 *
 * Both controls sit inside a link to the product's own page (Objects.tsx),
 * so every gesture here has to stop the click there rather than let it
 * bubble into the anchor and navigate away mid-browse.
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

  const goPrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShown((s) => Math.max(0, s - 1));
  };

  const goNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShown((s) => Math.min(images.length - 1, s + 1));
  };

  return (
    <>
      <SwipeTrack images={images} alt={alt} shown={shown} setShown={setShown} />
      <button
        type="button"
        className="editorial-object-arrow editorial-object-arrow-prev"
        onClick={goPrev}
        disabled={shown === 0}
        aria-label={`${alt}, previous view`}
      >
        <ChevronLeft size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <button
        type="button"
        className="editorial-object-arrow editorial-object-arrow-next"
        onClick={goNext}
        disabled={shown === images.length - 1}
        aria-label={`${alt}, next view`}
      >
        <ChevronRight size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <div className="editorial-object-dots">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShown(i);
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

/*
 * Drag distance is tracked in refs, not state — every pointermove would
 * otherwise be a re-render. dragPercent is the one piece that has to be
 * state, because it is what the track's live transform reads while a finger
 * is still down.
 */
function SwipeTrack({
  images,
  alt,
  shown,
  setShown,
}: {
  images: readonly string[];
  alt: string;
  shown: number;
  setShown: (i: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [dragPercent, setDragPercent] = useState(0);
  const startX = useRef(0);
  const widthPx = useRef(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const onDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    startX.current = e.clientX;
    widthPx.current = containerRef.current?.getBoundingClientRect().width || 1;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    e.stopPropagation();
    const deltaPx = e.clientX - startX.current;
    setDragPercent((deltaPx / widthPx.current) * 100);
  };

  const settle = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!dragging) return;
    setDragging(false);
    /* A fifth of the frame's width is a real swipe; anything short of that
       springs back rather than advancing on a stray touch. */
    if (dragPercent <= -20 && shown < images.length - 1) setShown(shown + 1);
    else if (dragPercent >= 20 && shown > 0) setShown(shown - 1);
    setDragPercent(0);
  };

  return (
    <div
      ref={containerRef}
      className={`editorial-object-swipe ${dragging ? "is-dragging" : ""}`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={settle}
      onPointerCancel={settle}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div
        className="editorial-object-swipe-track"
        style={{ transform: `translateX(calc(${-shown * 100}% + ${dragPercent}%))` }}
      >
        {images.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={alt}
            loading="lazy"
            aria-hidden={i !== shown}
            draggable={false}
            className="editorial-object-slide editorial-object-swipe-slide"
          />
        ))}
      </div>
    </div>
  );
}
