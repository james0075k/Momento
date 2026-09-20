"use client";

import { useEffect, useRef } from "react";

/**
 * Two lines (vertical on phones, horizontal from md) that fill as the steps scroll through
 * the viewport. Writes one CSS variable; the fill itself is a transform. Stays full when
 * motion is reduced or JS is off.
 */
export function ProgressLine() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const { top, height } = el.getBoundingClientRect();
      const span = height + window.innerHeight * 0.15;
      const progress = (window.innerHeight * 0.75 - top) / span;
      el.style.setProperty("--p", String(Math.min(1, Math.max(0, progress))));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <span
      ref={ref}
      aria-hidden
      style={{ "--p": 1 } as React.CSSProperties}
      className="pointer-events-none absolute inset-0"
    >
      <span className="bg-ink/15 absolute bottom-5 left-5 top-5 w-0.5 md:inset-x-5 md:bottom-auto md:h-0.5 md:w-auto" />
      <span className="bg-brand absolute bottom-5 left-5 top-5 w-0.5 origin-top [transform:scaleY(var(--p))] md:hidden" />
      <span className="bg-brand absolute inset-x-5 top-5 hidden h-0.5 origin-left [transform:scaleX(var(--p))] md:block" />
    </span>
  );
}
