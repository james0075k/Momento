"use client";

import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { PhotoScene } from "@/components/home/scenes";
import { cn } from "@/lib/utils";

const round =
  "focus-visible:outline-ring inline-flex size-11 items-center justify-center rounded-full bg-surface/90 text-ink shadow-md backdrop-blur transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2";

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    close.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Zoomed photo"
      className="bg-ink/95 fixed inset-0 z-50 flex flex-col"
    >
      <div className="flex justify-end p-3">
        <button
          ref={close}
          type="button"
          onClick={onClose}
          className={round}
          aria-label="Close zoom"
        >
          <X aria-hidden className="size-5" />
        </button>
      </div>
      {/* The image is larger than the screen: drag or pinch to look around. */}
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <div className="relative mx-auto aspect-square w-[180vw] max-w-[1400px] md:w-[min(120vw,1400px)]">
          <Image
            src={src}
            alt={alt}
            fill
            sizes="(min-width: 768px) 1400px, 180vw"
            className="object-contain"
          />
        </div>
      </div>
    </div>
  );
}

interface GalleryProps {
  images: string[];
  title: string;
}

/** Big photo with thumbnails, hover magnify on desktop, swipe on phones, and a full-screen zoom. */
export function Gallery({ images, title }: GalleryProps) {
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
  const touchStart = useRef<number | null>(null);
  const count = images.length;
  const current = images[index];
  const alt = `${title}, photo ${index + 1} of ${count}`;

  const step = (delta: number) => setIndex((value) => (value + delta + count) % count);

  const onMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    setLens({
      x: ((event.clientX - box.left) / box.width) * 100,
      y: ((event.clientY - box.top) / box.height) * 100,
    });
  };

  return (
    <div>
      <div
        className="relative"
        onTouchStart={(event) => (touchStart.current = event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          const start = touchStart.current;
          const end = event.changedTouches[0]?.clientX;
          touchStart.current = null;
          if (count > 1 && start !== null && end !== undefined && Math.abs(end - start) > 48) {
            step(end < start ? 1 : -1);
          }
        }}
      >
        <button
          type="button"
          onClick={() => current && setZoomOpen(true)}
          onPointerMove={onMove}
          onPointerLeave={() => setLens(null)}
          aria-label="Zoom photo"
          className="bg-tint focus-visible:outline-ring group relative block aspect-square w-full overflow-hidden rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 md:cursor-zoom-in"
        >
          {current ? (
            <Image
              src={current}
              alt={alt}
              fill
              priority
              sizes="(min-width: 1024px) 46rem, 100vw"
              style={
                lens
                  ? { transform: "scale(1.9)", transformOrigin: `${lens.x}% ${lens.y}%` }
                  : undefined
              }
              className={cn("object-cover", lens ? "" : "transition-transform duration-300")}
            />
          ) : (
            <PhotoScene scene="himal" label={title} />
          )}
          {current && (
            <span
              aria-hidden
              className="bg-surface/90 text-ink absolute bottom-3 right-3 inline-flex size-11 items-center justify-center rounded-full shadow-md"
            >
              <ZoomIn className="size-5" />
            </span>
          )}
        </button>
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className={cn(round, "absolute left-3 top-1/2 -translate-y-1/2")}
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className={cn(round, "absolute right-3 top-1/2 -translate-y-1/2")}
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Photos">
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={cn(
                  "focus-visible:outline-ring relative block size-16 overflow-hidden rounded-xl border-2 focus-visible:outline-2 focus-visible:outline-offset-2",
                  i === index ? "border-brand" : "border-transparent opacity-80 hover:opacity-100",
                )}
              >
                <Image src={src} alt="" fill sizes="4rem" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {zoomOpen && current && (
        <Lightbox src={current} alt={alt} onClose={() => setZoomOpen(false)} />
      )}
    </div>
  );
}
