import Link from "next/link";
import { HERO_SLIDES } from "@/config/hero-slides";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HeroSlider } from "./hero-slider";

interface HeroProps {
  title: string;
  subtitle?: string;
}

/**
 * A clear, full-screen stage for photos or videos (see config/hero-slides.ts) with the headline and
 * one button laid over it. The gradient keeps the text readable on any media.
 */
export function Hero({ title, subtitle }: HeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      className="bg-ink text-surface relative isolate flex min-h-[calc(100svh-4.5rem)] flex-col overflow-hidden md:min-h-svh"
    >
      <HeroSlider slides={HERO_SLIDES} />
      <div
        aria-hidden
        className="from-ink/80 via-ink/25 bg-linear-to-t md:from-ink/65 md:via-ink/20 md:bg-linear-to-r pointer-events-none absolute inset-0 to-transparent md:to-transparent"
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-16 md:px-8">
        <div className="mt-auto pb-10 md:my-auto md:pb-0">
          <h1
            id="hero-title"
            className="max-w-2xl text-[2.6rem] font-semibold leading-[1.04] tracking-tight md:text-6xl lg:text-7xl"
          >
            {title}
          </h1>
          <p className="text-surface/95 mt-5 max-w-md text-base md:text-lg">
            {(subtitle ?? "Photo books, framed prints and magnets, printed in Nepal.").replace(
              /[.!?\s]*$/,
              ".",
            )}{" "}
            Pay by eSewa, Khalti or bank after we confirm your order.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/shop"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-surface/40 bg-surface/15 text-surface hover:bg-surface/25 h-12 backdrop-blur-md",
              )}
            >
              Explore products
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
