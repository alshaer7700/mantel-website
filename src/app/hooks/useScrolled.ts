import { useEffect, useState } from "react";

/**
 * Whether the page has scrolled past a threshold.
 *
 * Used by the header to condense: at the top the identity is given room —
 * the wordmark at full size with its locality line under it — and once the
 * page is moving it contracts to a single line, so the mark stays present
 * without holding onto vertical space a reader is trying to scroll through.
 *
 * The listener is passive (it never calls preventDefault, and saying so lets
 * the browser scroll without waiting on it) and the read is coalesced into an
 * animation frame, because scroll fires far more often than a layout can
 * usefully change. State is only set when the boolean actually flips, so a
 * long scroll re-renders twice, not once per pixel.
 */
export function useScrolled(threshold = 24): boolean {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let frame = 0;

    const read = () => {
      frame = 0;
      setScrolled((was) => {
        const now = window.scrollY > threshold;
        return now === was ? was : now;
      });
    };

    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(read);
    };

    // Run once on mount: a refresh can restore a scroll position, and a deep
    // link can land mid-page, so "at the top" must not be assumed.
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [threshold]);

  return scrolled;
}
