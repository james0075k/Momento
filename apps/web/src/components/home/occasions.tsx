"use client";

import { Baby, Flame, Gem, Mountain, Wind, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { BookCover, type Cover } from "./book-cover";
import { Section, SectionHeading } from "./section";
import { FULL_BLEED, useCarousel } from "./use-carousel";

interface Occasion {
  slug: string;
  name: string;
  icon: LucideIcon;
  covers: Cover[];
}

/** Sample covers to show what each occasion looks like as a book. */
const OCCASIONS: Occasion[] = [
  {
    slug: "wedding",
    name: "Wedding",
    icon: Gem,
    covers: [
      { title: "Anita & Sagar", note: "Wedding album", variant: "framed", scene: "wedding" },
      { title: "Mehendi Night", note: "Before the big day", variant: "full", scene: "tihar" },
      { title: "Bidaai", note: "A family says goodbye", variant: "framed", scene: "baby" },
      {
        title: "Honeymoon in Pokhara",
        note: "Just the two of us",
        variant: "full",
        scene: "travel",
      },
    ],
  },
  {
    slug: "dashain",
    name: "Dashain",
    icon: Wind,
    covers: [
      { title: "Tika at Home", note: "Vijaya Dashami", variant: "framed", scene: "dashain" },
      {
        title: "Kites Over Bhaktapur",
        note: "Dashain afternoons",
        variant: "full",
        scene: "dashain",
      },
      { title: "Cousins Reunion", note: "Everyone came home", variant: "framed", scene: "himal" },
      { title: "Village Dashain", note: "Where it all began", variant: "full", scene: "himal" },
    ],
  },
  {
    slug: "tihar",
    name: "Tihar",
    icon: Flame,
    covers: [
      {
        title: "Lights of Tihar",
        note: "Five nights, one home",
        variant: "framed",
        scene: "tihar",
      },
      { title: "Bhai Tika", note: "Brothers and sisters", variant: "full", scene: "wedding" },
      { title: "Rangoli Nights", note: "Marigold and diyas", variant: "framed", scene: "tihar" },
      { title: "Deusi Bhailo", note: "Songs down the street", variant: "full", scene: "tihar" },
    ],
  },
  {
    slug: "baby",
    name: "Baby",
    icon: Baby,
    covers: [
      { title: "Aarav Turns One", note: "The first year", variant: "framed", scene: "baby" },
      { title: "Twelve Months", note: "Month by month", variant: "full", scene: "baby" },
      { title: "Annaprashan", note: "First rice feeding", variant: "framed", scene: "dashain" },
      { title: "Little Diya", note: "Our brightest light", variant: "full", scene: "tihar" },
    ],
  },
  {
    slug: "travel",
    name: "Travel",
    icon: Mountain,
    covers: [
      { title: "Boudha Mornings", note: "Kathmandu", variant: "framed", scene: "travel" },
      {
        title: "Annapurna Base Camp",
        note: "Ten days on the trail",
        variant: "full",
        scene: "himal",
      },
      { title: "Trek to Everest", note: "One step at a time", variant: "framed", scene: "himal" },
      { title: "Pokhara Days", note: "Lakeside", variant: "full", scene: "travel" },
    ],
  },
];

interface OccasionsProps {
  id: string;
  title: string;
  subtitle?: string;
}

/** Occasion tabs above a strip of sample photo-book covers for the chosen occasion. */
export function Occasions({ id, title, subtitle }: OccasionsProps) {
  const headingId = `occasions-${id}`;
  const [active, setActive] = useState(0);
  const bounds = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  useCarousel(track, bounds, active);
  const occasion = OCCASIONS[active] ?? OCCASIONS[0]!;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (active + step + OCCASIONS.length) % OCCASIONS.length;
    setActive(next);
    tabs.current[next]?.focus();
  };

  return (
    <Section id="occasions" labelledBy={headingId} tone="muted" sectionClassName="overflow-x-clip">
      <div ref={bounds}>
        <SectionHeading id={headingId} title={title} subtitle={subtitle} reveal />
        <div
          role="tablist"
          aria-label="Occasions"
          onKeyDown={onKeyDown}
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:mx-0 md:justify-between md:px-0 [&::-webkit-scrollbar]:hidden"
        >
          {OCCASIONS.map((item, index) => {
            const Icon = item.icon;
            const selected = index === active;
            return (
              <button
                key={item.slug}
                ref={(el) => {
                  tabs.current[index] = el;
                }}
                type="button"
                role="tab"
                id={`occasion-tab-${item.slug}`}
                aria-selected={selected}
                aria-controls="occasion-panel"
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                className={cn(
                  "focus-visible:outline-ring flex min-h-24 min-w-28 flex-1 shrink-0 flex-col items-center justify-center gap-2 rounded-2xl px-4 py-4 font-medium backdrop-blur-md transition-colors focus-visible:outline-2",
                  selected
                    ? "border-ink/10 bg-surface/70 text-ink border"
                    : "text-muted-foreground hover:bg-surface/40 border border-transparent",
                )}
              >
                <Icon aria-hidden className="size-7" strokeWidth={1.5} />
                {item.name}
              </button>
            );
          })}
        </div>

        <div
          role="tabpanel"
          id="occasion-panel"
          aria-labelledby={`occasion-tab-${occasion.slug}`}
          className="mt-10"
        >
          <ul
            ref={track}
            className={cn(
              "flex snap-x snap-mandatory gap-6 overflow-x-auto pb-8 md:gap-10",
              FULL_BLEED,
            )}
          >
            {occasion.covers.map((cover) => (
              <li
                key={cover.title}
                data-fade
                className="relative w-[78vw] max-w-[27rem] shrink-0 snap-start md:w-[27rem]"
              >
                <BookCover cover={cover} />
                <span
                  data-veil
                  aria-hidden
                  className="bg-paper pointer-events-none absolute -inset-3 opacity-0 transition-opacity duration-200"
                />
              </li>
            ))}
          </ul>
          <Link
            href={`/shop?occasion=${occasion.slug}`}
            className="text-ink decoration-brand focus-visible:outline-ring inline-flex min-h-11 items-center font-medium underline decoration-2 underline-offset-4 focus-visible:outline-2"
          >
            Shop {occasion.name.toLowerCase()} keepsakes
          </Link>
        </div>
      </div>
    </Section>
  );
}
