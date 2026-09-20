import { Clock, MessageCircle, Printer, ShieldCheck, type LucideIcon } from "lucide-react";
import { Section } from "./section";

const GUARANTEES: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: ShieldCheck, title: "Quality promise", text: "Every print is checked before it ships." },
  { icon: Clock, title: "Delivery time", text: "2 to 3 working days in Kathmandu Valley." },
  {
    icon: MessageCircle,
    title: "WhatsApp support",
    text: "Real people answer, from order to delivery.",
  },
  { icon: Printer, title: "Reprint promise", text: "Misprinted or damaged? We reprint it free." },
];

interface GuaranteesProps {
  id: string;
  title: string;
  subtitle?: string;
}

export function Guarantees({ id, title, subtitle }: GuaranteesProps) {
  const headingId = `guarantees-${id}`;
  return (
    <Section labelledBy={headingId} tone="paper">
      <div className="mb-10 max-w-2xl">
        <h2
          id={headingId}
          className="text-3xl font-semibold leading-[1.1] tracking-tight md:text-4xl"
        >
          {title}
        </h2>
        {subtitle && <p className="text-muted-foreground mt-3 text-lg">{subtitle}</p>}
      </div>
      <ul className="border-ink grid border-y-2 sm:grid-cols-2 lg:grid-cols-4">
        {GUARANTEES.map(({ icon: Icon, title: itemTitle, text }) => (
          <li
            key={itemTitle}
            className="border-ink/15 flex gap-4 border-b py-6 last:border-b-0 lg:border-b-0 lg:border-r lg:px-6 lg:first:pl-0 lg:last:border-r-0 lg:last:pr-0"
          >
            <Icon aria-hidden className="text-brand mt-0.5 size-6 shrink-0" strokeWidth={1.75} />
            <div>
              <h3 className="font-semibold">{itemTitle}</h3>
              <p className="text-muted-foreground mt-1 text-sm">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
