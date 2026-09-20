import { CountUp } from "./count-up";
import { ScrollReveal } from "./scroll-reveal";
import { Section } from "./section";

/** The opening statement: words light up as it scrolls into view. */
export function Statement() {
  return (
    <Section tone="plain" labelledBy="statement-title" sectionClassName="pb-8 md:pb-12">
      <ScrollReveal
        id="statement-title"
        text="Your phone holds years of photos. Most of them stay buried in the gallery. Print the ones worth keeping."
        className="max-w-4xl text-4xl font-semibold leading-[1.1] tracking-tight md:text-6xl"
      />
    </Section>
  );
}

export interface Stat {
  value: number;
  suffix?: string;
  label: string;
}

/** Count-up numbers on a dark background. The label is the term, so screen readers hear it first. */
export function StatList({ items }: { items: Stat[] }) {
  return (
    <dl className="mb-12 grid gap-8 md:mb-16 md:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="border-surface/25 flex flex-col-reverse border-t pt-4">
          <dt className="text-surface/85 mt-1 max-w-[16rem]">{item.label}</dt>
          <dd className="text-accent font-heading text-5xl font-semibold md:text-6xl">
            <CountUp value={item.value} suffix={item.suffix} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
