import { useCallback, useEffect, useRef, useState } from "react";

/*
 * A product turning on the spot, from photos taken all the way round it
 * (objects.spin_images, supabase/039 — perfumes first). Frame 0 is the front
 * and is what shows at rest.
 *
 *   tap          one full turn, ending back on the front
 *   drag         turn it by hand, left or right (vertical scroll still works)
 *   ← / →        a frame at a time, for keyboards
 *   hover        on the shelf (`playOnHover`), one turn as the pointer arrives
 *
 * Every frame is an <img> stacked in the same box with only the current one
 * visible, so a turn never flickers waiting on a src swap. They load lazily
 * after the front one; until all have arrived, a turn waits for them.
 *
 * On the shelf the whole tile is a link to the product page, so it is not
 * `interactive` there: taps fall through to the link, and the page it opens
 * turns the product once on arrival (`autoplay`).
 */

type Props = {
  frames: readonly string[];
  alt: string;
  interactive?: boolean;
  autoplay?: boolean;
  playOnHover?: boolean;
  /** Milliseconds for one full turn. */
  duration?: number;
};

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);

export function Spin360({ frames, alt, interactive = true, autoplay = false, playOnHover = false, duration = 2400 }: Props) {
  const n = frames.length;
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [hinted, setHinted] = useState(false);
  const indexRef = useRef(0);
  const anim = useRef<number | null>(null);
  const drag = useRef<{ x: number; start: number; moved: boolean; id: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const ready = loaded >= n;

  const show = useCallback((i: number) => {
    const next = ((Math.round(i) % n) + n) % n;
    indexRef.current = next;
    setIndex(next);
  }, [n]);

  const stop = () => {
    if (anim.current !== null) cancelAnimationFrame(anim.current);
    anim.current = null;
  };

  /* One full turn from wherever it is, landing back on the same frame. */
  const play = useCallback(() => {
    if (n < 2 || anim.current !== null) return;
    const from = indexRef.current;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / duration);
      show(from + ease(p) * n);
      anim.current = p < 1 ? requestAnimationFrame(step) : null;
    };
    anim.current = requestAnimationFrame(step);
  }, [duration, n, show]);

  const pending = useRef(false);
  const request = () => {
    if (ready) play();
    else pending.current = true;
  };

  useEffect(() => {
    if (ready && pending.current) {
      pending.current = false;
      play();
    }
  }, [ready, play]);

  useEffect(() => {
    if (!autoplay) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!reduce) pending.current = true;
  }, [autoplay]);

  useEffect(() => () => stop(), []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || n < 2) return;
    stop();
    drag.current = { x: e.clientX, start: indexRef.current, moved: false, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) < 6) return;
    if (!d.moved) {
      d.moved = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    /* One drag across the box turns it about once round. */
    const width = box.current?.clientWidth || 300;
    show(d.start - (dx / width) * n);
    setHinted(true);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId) return;
    if (!d.moved) {
      setHinted(true);
      request();
    }
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!interactive || n < 2) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      stop();
      show(indexRef.current + (e.key === "ArrowRight" ? -1 : 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      request();
    }
  };

  return (
    <div
      ref={box}
      className={`mantel-spin${interactive ? " is-interactive" : ""}`}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `${alt}. 360° view: tap to turn, drag or use the arrow keys to rotate.` : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => { drag.current = null; }}
      onPointerEnter={playOnHover ? (e) => { if (e.pointerType === "mouse") request(); } : undefined}
      onKeyDown={onKeyDown}
    >
      {frames.map((src, i) => (
        <img
          key={`${src}-${i}`}
          src={src}
          alt={i === 0 && !interactive ? alt : ""}
          aria-hidden={i === 0 && !interactive ? undefined : true}
          draggable={false}
          loading={i === 0 ? "eager" : "lazy"}
          decoding="async"
          onLoad={() => setLoaded((c) => c + 1)}
          onError={() => setLoaded((c) => c + 1)}
          style={{ visibility: i === index ? "visible" : "hidden" }}
        />
      ))}
      {n > 1 && (
        <span className={`mantel-spin-badge${interactive && !hinted ? " is-hint" : ""}`} aria-hidden="true">
          360°{interactive && !hinted ? " · tap to turn" : ""}
        </span>
      )}
    </div>
  );
}
