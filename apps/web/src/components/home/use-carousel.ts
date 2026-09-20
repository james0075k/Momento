import { useCallback, useEffect, useState, type RefObject } from "react";

/**
 * Scroll behaviour shared by the horizontal strips. Items marked `data-fade` carry a
 * `data-veil` child; the veil thickens as the item slides out of the content column, so cards
 * at the edges dim while the ones in view stay crisp. Dimming is a veil rather than the item's
 * own opacity, so text contrast stays intact.
 */
export function useCarousel(
  track: RefObject<HTMLElement | null>,
  bounds: RefObject<HTMLElement | null>,
  resetKey?: unknown,
) {
  const [edges, setEdges] = useState({ canPrev: false, canNext: true });

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollLeft = 0;
    let frame = 0;

    const update = () => {
      frame = 0;
      // Percent scroll-padding resolves against the scrollport, so mirror the CSS padding in px.
      el.style.scrollPaddingLeft = getComputedStyle(el).paddingLeft;
      const box = (bounds.current ?? el).getBoundingClientRect();
      if (!reduceMotion) {
        el.querySelectorAll<HTMLElement>("[data-fade]").forEach((item) => {
          const veil = item.querySelector<HTMLElement>("[data-veil]");
          if (!veil) return;
          const rect = item.getBoundingClientRect();
          const visible = Math.min(rect.right, box.right) - Math.max(rect.left, box.left);
          const share = Math.max(0, Math.min(1, visible / rect.width));
          veil.style.opacity = String(share > 0.97 ? 0 : 0.7 * (1 - share));
        });
      }
      const canPrev = el.scrollLeft > 4;
      const canNext = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
      setEdges((old) =>
        old.canPrev === canPrev && old.canNext === canNext ? old : { canPrev, canNext },
      );
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [track, bounds, resetKey]);

  const scrollByItem = useCallback(
    (direction: 1 | -1) => {
      const el = track.current;
      const first = el?.querySelector<HTMLElement>("[data-fade]");
      if (!el || !first) return;
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollBy({
        left: direction * (first.offsetWidth + gap),
        behavior: reduceMotion ? "auto" : "smooth",
      });
    },
    [track],
  );

  return { ...edges, scrollByItem };
}

/** Classes that let a strip run edge to edge of the screen while its first item lines up with the content column. */
export const FULL_BLEED =
  "mx-[calc(50%_-_50vw)] px-[calc(50vw_-_50%)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";
