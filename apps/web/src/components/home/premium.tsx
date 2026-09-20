import type { ReactNode } from "react";
import { Section, SectionHeading } from "./section";

const OPTIONS: Array<{ title: string; text: string; art: ReactNode }> = [
  {
    title: "Paper that feels like a photograph",
    text: "170 gsm silk for books, thicker 300 gsm pages for wedding albums. Colours stay true to your screen.",
    art: (
      <>
        <rect
          x="34"
          y="34"
          width="92"
          height="70"
          className="fill-surface stroke-ink/25"
          transform="rotate(-6 80 70)"
        />
        <rect
          x="34"
          y="30"
          width="92"
          height="70"
          className="fill-surface stroke-ink/25"
          transform="rotate(2 80 65)"
        />
        <rect
          x="34"
          y="26"
          width="92"
          height="70"
          className="fill-surface stroke-ink/40"
          transform="rotate(-2 80 61)"
        />
        <path
          d="M42 84 L62 58 L76 74 L90 54 L118 84Z"
          className="fill-ink/70"
          transform="rotate(-2 80 61)"
        />
        <circle cx="100" cy="42" r="6" className="fill-accent" transform="rotate(-2 80 61)" />
      </>
    ),
  },
  {
    title: "Covers made to be handled",
    text: "Softcover for everyday albums, hardcover for keepsakes, leatherette with a gift box for weddings.",
    art: (
      <>
        <rect x="42" y="16" width="80" height="94" rx="3" className="fill-ink" />
        <rect x="42" y="16" width="9" height="94" className="fill-surface/25" />
        {Array.from({ length: 24 }, (_, i) => (
          <circle
            key={i}
            cx={62 + (i % 6) * 10}
            cy={30 + Math.floor(i / 6) * 18}
            r="1.2"
            className="fill-surface/35"
          />
        ))}
        <rect x="64" y="52" width="40" height="3" className="fill-surface/70" />
        <rect x="70" y="60" width="28" height="3" className="fill-surface/50" />
      </>
    ),
  },
  {
    title: "Foil that catches the light",
    text: "Add a name, a date or a few words in gold foil on the cover. We send a proof on WhatsApp first.",
    art: (
      <>
        <rect x="42" y="16" width="80" height="94" rx="3" className="fill-brand" />
        <rect
          x="52"
          y="26"
          width="60"
          height="74"
          fill="none"
          strokeWidth="1"
          className="stroke-accent"
        />
        <text
          x="82"
          y="66"
          textAnchor="middle"
          fontSize="15"
          className="fill-accent font-heading"
          fontWeight="600"
        >
          Anita
        </text>
        <text x="82" y="82" textAnchor="middle" fontSize="8" className="fill-accent font-heading">
          & Sagar
        </text>
        <path d="M62 44 L102 44" className="stroke-accent" strokeWidth="1" />
      </>
    ),
  },
];

export function Premium() {
  return (
    <Section labelledBy="premium-title">
      <SectionHeading
        id="premium-title"
        title="Details you can feel when it arrives"
        subtitle="Pick the paper, the cover and the finish. Each one is priced clearly on the product page."
      />
      <ul className="grid gap-10 md:grid-cols-3 md:gap-8">
        {OPTIONS.map((option) => (
          <li key={option.title}>
            <div className="bg-tint aspect-[4/3] w-full">
              <svg viewBox="0 0 160 120" role="presentation" aria-hidden className="h-full w-full">
                {option.art}
              </svg>
            </div>
            <h3 className="mt-5 text-xl font-semibold leading-snug">{option.title}</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">{option.text}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
