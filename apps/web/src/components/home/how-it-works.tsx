import { HOW_IT_WORKS_STEPS as STEPS } from "@/content/faq";
import { ProgressLine } from "./progress-line";
import { Section, SectionHeading } from "./section";

export function HowItWorks() {
  return (
    <Section id="how-it-works" labelledBy="how-title" tone="muted">
      <SectionHeading id="how-title" title="Three steps from photo to doorstep" />
      <ol className="relative grid gap-12 md:grid-cols-3 md:gap-8">
        <ProgressLine />
        {STEPS.map((step, index) => (
          <li key={step.title} className="relative pl-16 md:pl-0 md:pt-16">
            <span className="bg-brand text-surface font-heading absolute left-0 top-0 flex size-10 items-center justify-center rounded-full text-lg font-semibold">
              {index + 1}
            </span>
            <h3 className="text-xl font-semibold">{step.title}</h3>
            <p className="text-muted-foreground mt-2 max-w-xs">{step.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
