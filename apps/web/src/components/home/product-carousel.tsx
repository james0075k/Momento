"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { formatNpr } from "@/lib/format";
import type { ProductCardData } from "@/lib/home";
import { cn } from "@/lib/utils";
import { PhotoScene } from "./scenes";
import { SectionHeading } from "./section";
import { FULL_BLEED, useCarousel } from "./use-carousel";

const arrow =
  "border-ink/15 bg-ink/5 text-ink hover:bg-ink/10 focus-visible:outline-ring inline-flex size-12 items-center justify-center rounded-full border backdrop-blur-md transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-35 disabled:hover:bg-ink/5";

function ProductSlide({ product }: { product: ProductCardData }) {
  return (
    <li data-fade className="relative w-[78vw] max-w-[30rem] shrink-0 snap-start md:w-[30rem]">
      <Link
        href={`/shop/${product.slug}`}
        className="focus-visible:outline-ring group block focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <div className="bg-tint relative aspect-square overflow-hidden rounded-3xl">
          {product.image ? (
            <Image
              src={product.image}
              alt=""
              fill
              sizes="(min-width: 768px) 40rem, 78vw"
              className="object-cover transition-transform duration-700 motion-safe:group-hover:scale-105"
            />
          ) : (
            <PhotoScene
              scene={product.scene}
              className="transition-transform duration-700 motion-safe:group-hover:scale-105"
            />
          )}
          <span className="border-surface/40 bg-ink/40 text-surface absolute right-4 top-4 rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-md">
            {product.hasVariants ? "From " : ""}
            {formatNpr(product.fromPrice)}
          </span>
        </div>
        {product.category && (
          <span className="bg-ink/5 text-ink mt-6 inline-flex rounded-full px-3 py-1.5 text-sm font-medium">
            {product.category}
          </span>
        )}
        <h3 className="mt-4 text-2xl font-semibold leading-tight md:text-3xl">{product.title}</h3>
        <p className="text-muted-foreground mt-3 line-clamp-3 max-w-md">
          {product.shortDescription}
        </p>
        <span className="text-brand mt-4 inline-block font-medium underline-offset-4 group-hover:underline">
          View product
        </span>
      </Link>
      <span
        data-veil
        aria-hidden
        className="bg-paper pointer-events-none absolute -inset-3 opacity-0 transition-opacity duration-200"
      />
    </li>
  );
}

interface ProductCarouselProps {
  headingId: string;
  title: string;
  subtitle?: string;
  products: ProductCardData[];
}

/** Big rounded cards that slide sideways; the ones at the edges dim as they leave the column. */
export function ProductCarousel({ headingId, title, subtitle, products }: ProductCarouselProps) {
  const bounds = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const { canPrev, canNext, scrollByItem } = useCarousel(track, bounds);

  return (
    <div ref={bounds}>
      <div className="mb-10 flex items-end justify-between gap-6 md:mb-14">
        <SectionHeading
          id={headingId}
          title={title}
          subtitle={subtitle}
          className="mb-0 md:mb-0"
          reveal
        />
        <div className="hidden shrink-0 gap-3 md:flex">
          <button
            type="button"
            className={arrow}
            onClick={() => scrollByItem(-1)}
            disabled={!canPrev}
            aria-label="Previous products"
          >
            <ArrowLeft aria-hidden />
          </button>
          <button
            type="button"
            className={arrow}
            onClick={() => scrollByItem(1)}
            disabled={!canNext}
            aria-label="Next products"
          >
            <ArrowRight aria-hidden />
          </button>
        </div>
      </div>
      <ul
        ref={track}
        className={cn(
          "flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 md:gap-12",
          FULL_BLEED,
        )}
      >
        {products.map((product) => (
          <ProductSlide key={product.id} product={product} />
        ))}
      </ul>
    </div>
  );
}
