import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

/*
 * The image slot on a retail card, for products that have more than one face.
 *
 * Every product with more than one face — the tote, the lighter, the match
 * sticks alike — gets the same swipeable track rather than a flip on some
 * cards and a drag on others. This used to give exactly-two-face products
 * (the tote, the lighter) a 3D card flip instead — dropped in favour of one
 * interaction that behaves the same everywhere, rather than a flip on some
 * cards and a swipe on others.
 *
 * A product with one image renders exactly the <img> the card rendered
 * before, with no dots and nothing to click.
 *
 * Every control here — swipe, arrows, dots, zoom — sits inside a link to the
 * product's own page on the shelf grid (Objects.tsx), so every gesture has
 * to stop the click there rather than let it bubble into the anchor and
 * navigate away. `zoomable` defaults to off for exactly that reason: a
 * magnify trigger is one more thing to tap past on an already-small grid
 * tile, competing with the arrows and dots it already carries. The product's
 * own page (ProductDetail.tsx), which has nothing else fighting the image
 * for space, turns it on.
 */

type Props = {
  images: readonly string[];
  alt: string;
  zoomable?: boolean;
};

export function ObjectSlides({ images, alt, zoomable = false }: Props) {
  const [shown, setShown] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  const openZoom = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setZoomed(true);
  };

  if (images.length < 2) {
    return (
      <>
        <img src={images[0]} alt={alt} loading="lazy" />
        {zoomable && (
          <button
            type="button"
            className="editorial-object-zoom-trigger"
            onClick={openZoom}
            aria-label={`Zoom in on ${alt}`}
          >
            <Maximize2 size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
        {zoomed && images[0] && <Lightbox src={images[0]} alt={alt} onClose={() => setZoomed(false)} />}
      </>
    );
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
      {zoomable && (
        <button
          type="button"
          className="editorial-object-zoom-trigger"
          onClick={openZoom}
          aria-label={`Zoom in on ${alt}`}
        >
          <Maximize2 size={14} strokeWidth={1.5} aria-hidden="true" />
        </button>
      )}
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
      {zoomed && images[shown] && <Lightbox src={images[shown]} alt={alt} onClose={() => setZoomed(false)} />}
    </>
  );
}

/*
 * The zoomed view: the same photograph, full-screen, with nothing else on
 * it. Closes on the X, on clicking the backdrop, or on Escape — three exits
 * because a full-bleed dark overlay is easy to get stuck inside otherwise.
 */
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="editorial-object-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }}
    >
      <button
        type="button"
        className="editorial-object-lightbox-close"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close"
      >
        <X size={20} strokeWidth={1.5} aria-hidden="true" />
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    </div>
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
