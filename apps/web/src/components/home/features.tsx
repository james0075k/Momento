import { Layers, ScanSearch, Truck, Upload, type LucideIcon } from "lucide-react";
import { Section, SectionHeading } from "./section";

const FEATURES: Array<{ icon: LucideIcon; title: string; text: string }> = [
  {
    icon: Upload,
    title: "Easy upload",
    text: "Send your photos on WhatsApp or add them at checkout. There is no app to install.",
  },
  {
    icon: ScanSearch,
    title: "Print-quality check",
    text: "We look at every photo before printing and tell you if one is too soft to print well.",
  },
  {
    icon: Truck,
    title: "Fast Nepal delivery",
    text: "2 to 3 working days inside Kathmandu Valley, 4 to 7 days across the rest of Nepal.",
  },
  {
    icon: Layers,
    title: "Premium paper",
    text: "Photo books use 170 gsm silk paper with lay-flat binding, so spreads run edge to edge.",
  },
];

export function Features() {
  return (
    <Section labelledBy="features-title">
      <SectionHeading
        id="features-title"
        title="Made simple, so the photos stay the focus"
        subtitle="You choose what to keep. We take care of the rest."
      />
      <ul className="border-ink/15 grid border-t sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, text }, index) => (
          <li
            key={title}
            className={`border-ink/15 flex gap-5 border-b py-8 sm:px-8 ${index % 2 === 0 ? "sm:border-r sm:pl-0" : "sm:pr-0"}`}
          >
            <Icon aria-hidden className="text-brand mt-1 size-8 shrink-0" strokeWidth={1.5} />
            <div>
              <h3 className="text-xl font-semibold">{title}</h3>
              <p className="text-muted-foreground mt-2 max-w-sm">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
