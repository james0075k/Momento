"use client";

import { Fragment, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Dimmest a word gets. Kept high enough that large text still meets 3:1 contrast. */
const MIN_OPACITY = 0.4;

const clamp = (n: number) => Math.min(1, Math.max(0, n));

interface ScrollRevealProps {
  text: string;
  id?: string;
  className?: string;
}

/**
 * A heading whose words light up one by one as it scrolls through the viewport.
 * Opacity only. Words stay fully visible until the heading is on screen, with JS off,
 * or when motion is reduced.
 */
export function ScrollReveal({ text, id, className }: ScrollRevealProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const words = text.split(" ");

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const spans = Array.from(el.querySelectorAll<HTMLElement>("[data-word]"));
    let frame = 0;

    const update = () => {
      frame = 0;
      const { top, height } = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const progress = clamp((vh * 0.9 - top) / (height + vh * 0.35));
      spans.forEach((span, i) => {
        const lit = clamp(progress * spans.length - i);
        span.style.opacity = String(MIN_OPACITY + (1 - MIN_OPACITY) * lit);
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    if (el.getBoundingClientRect().top < window.innerHeight) update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <h2 ref={ref} id={id} className={cn(className)}>
      {words.map((word, i) => (
        <Fragment key={`${word}-${i}`}>
          <span data-word>{word}</span>{" "}
        </Fragment>
      ))}
    </h2>
  );
}
