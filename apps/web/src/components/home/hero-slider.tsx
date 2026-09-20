"use client";

import { Pause, Play } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type HeroSlide =
  { type: "image"; src: string; alt?: string } | { type: "video"; src: string; poster?: string };

type Slide = HeroSlide | { type: "gradient"; className: string };

/** Shown until real slides are added in config/hero-slides.ts. Brand colours only. */
const PLACEHOLDERS: Slide[] = [
  {
    type: "gradient",
    className:
      "bg-ink bg-[radial-gradient(ellipse_at_75%_30%,color-mix(in_srgb,var(--accent)_38%,transparent),transparent_60%)]",
  },
  {
    type: "gradient",
    className:
      "bg-ink bg-[radial-gradient(ellipse_at_20%_80%,color-mix(in_srgb,var(--brand)_55%,transparent),transparent_60%)]",
  },
  {
    type: "gradient",
    className:
      "bg-[color-mix(in_srgb,var(--ink)_78%,var(--brand))] bg-[radial-gradient(ellipse_at_80%_70%,color-mix(in_srgb,var(--accent)_28%,transparent),transparent_55%)]",
  },
];

const IMAGE_MS = 6000;
const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Full-bleed slides that cross-fade. Images stay for a few seconds, videos play muted and move on
 * when they end. There is a pause button and dots, and nothing moves if the visitor prefers
 * reduced motion.
 */
export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const items: Slide[] = slides.length > 0 ? slides : PLACEHOLDERS;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const videos = useRef<Array<HTMLVideoElement | null>>([]);
  const count = items.length;
  const current = items[index];

  useEffect(() => {
    if (reducedMotion()) setPaused(true);
  }, []);

  const next = () => setIndex((i) => (i + 1) % count);

  // Images and gradients advance on a timer; videos advance when they end (see onEnded).
  useEffect(() => {
    if (paused || count < 2 || current?.type === "video") return;
    const timer = window.setTimeout(next, IMAGE_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, paused, count, current?.type]);

  // Play the visible video, rewind and stop the rest.
  useEffect(() => {
    videos.current.forEach((video, i) => {
      if (!video) return;
      if (i === index && !paused) void video.play().catch(() => undefined);
      else {
        video.pause();
        if (i !== index) video.currentTime = 0;
      }
    });
  }, [index, paused]);

  return (
    <>
      <div className="absolute inset-0 overflow-hidden" aria-hidden>
        {items.map((slide, i) => {
          const active = i === index;
          const near = active || i === (index + 1) % count;
          return (
            <div
              key={i}
              className={cn(
                "absolute inset-0 transition-opacity duration-1000",
                active ? "opacity-100" : "opacity-0",
                slide.type === "gradient" && slide.className,
              )}
            >
              {slide.type === "image" && (
                <Image
                  src={slide.src}
                  alt=""
                  fill
                  priority={i === 0}
                  sizes="100vw"
                  className={cn("object-cover", active && !paused && "hero-zoom")}
                />
              )}
              {slide.type === "video" && (
                <video
                  ref={(el) => {
                    videos.current[i] = el;
                  }}
                  src={slide.src}
                  poster={slide.poster}
                  muted
                  playsInline
                  preload={near ? "auto" : "none"}
                  tabIndex={-1}
                  onEnded={next}
                  onError={next}
                  className="h-full w-full object-cover motion-reduce:hidden"
                />
              )}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <div className="border-surface/25 bg-surface/10 text-surface absolute right-4 top-[4.5rem] z-20 flex items-center rounded-full border px-1 backdrop-blur-md md:bottom-6 md:right-8 md:top-auto">
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play slideshow" : "Pause slideshow"}
            className="focus-visible:outline-surface inline-flex size-11 items-center justify-center rounded-full focus-visible:outline-2"
          >
            {paused ? (
              <Play aria-hidden className="size-4" />
            ) : (
              <Pause aria-hidden className="size-4" />
            )}
          </button>
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Show slide ${i + 1} of ${count}`}
              aria-current={i === index}
              className="focus-visible:outline-surface group inline-flex h-11 w-7 items-center justify-center rounded-full focus-visible:outline-2"
            >
              <span
                className={cn(
                  "block h-2 rounded-full transition-all duration-300",
                  i === index ? "bg-surface w-5" : "bg-surface/50 group-hover:bg-surface/80 w-2",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
