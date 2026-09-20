"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";
import type { ReviewData } from "@/lib/home";
import { Stars } from "./stars";

const arrow =
  "bg-surface text-ink hover:bg-accent focus-visible:outline-ring inline-flex size-11 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

export function ReviewsCarousel({ reviews }: { reviews: ReviewData[] }) {
  const track = useRef<HTMLUListElement>(null);

  const scroll = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({
      left: direction * el.clientWidth * 0.8,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  };

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Customer reviews">
      <ul
        ref={track}
        tabIndex={0}
        aria-label="Reviews, scroll sideways"
        className="focus-visible:outline-accent -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] focus-visible:outline-2 md:-mx-8 md:scroll-px-8 md:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {reviews.map((review) => (
          <li key={review.id} className="w-[17.5rem] shrink-0 snap-start sm:w-[21rem]">
            <figure className="bg-surface text-ink m-0 flex h-full min-h-[22rem] flex-col p-6">
              <Stars rating={review.rating} />
              {review.title && (
                <p className="font-heading mt-4 text-xl font-semibold leading-tight">
                  {review.title}
                </p>
              )}
              <blockquote className="mt-3 line-clamp-6 flex-1 text-[0.95rem] leading-relaxed">
                {review.comment}
              </blockquote>
              <div className="mt-5 flex items-end justify-between gap-3">
                <figcaption className="text-sm">
                  <span className="block font-medium">{review.name}</span>
                  {review.verified && (
                    <span className="text-ink flex items-center gap-1 font-medium">
                      <Check aria-hidden className="text-success size-4" strokeWidth={3} />
                      Verified order
                    </span>
                  )}
                </figcaption>
                {review.photo && (
                  <span className="bg-surface relative block size-16 shrink-0 rotate-3 overflow-hidden shadow-[0_6px_14px_-6px_color-mix(in_srgb,var(--ink)_60%,transparent)]">
                    <Image
                      src={review.photo}
                      alt={`Print shared by ${review.name}`}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </span>
                )}
              </div>
            </figure>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          className={arrow}
          onClick={() => scroll(-1)}
          aria-label="Previous reviews"
        >
          <ChevronLeft aria-hidden />
        </button>
        <button type="button" className={arrow} onClick={() => scroll(1)} aria-label="Next reviews">
          <ChevronRight aria-hidden />
        </button>
      </div>
    </div>
  );
}
