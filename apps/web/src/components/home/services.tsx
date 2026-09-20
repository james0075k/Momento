import Image from "next/image";
import { formatNpr } from "@/lib/format";
import type { ServiceRowData } from "@/lib/home";
import { whatsappLink } from "@/lib/whatsapp";
import { PhotoScene, type SceneName } from "./scenes";
import { Section, SectionHeading } from "./section";

const SCENES: SceneName[] = ["dashain", "wedding", "tihar", "travel", "baby"];

/** Soft colour glows, so the frosted panels in front of them have something to blur. */
const GLOWS = (
  <div
    aria-hidden
    className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_12%_15%,color-mix(in_srgb,var(--brand)_26%,transparent),transparent_42%),radial-gradient(circle_at_88%_80%,color-mix(in_srgb,var(--accent)_38%,transparent),transparent_45%)]"
  />
);

interface ServicesProps {
  id: string;
  title: string;
  subtitle?: string;
  services: ServiceRowData[];
  whatsappNumber: string;
}

/** Glass rows: services are a list you scan, and each one starts a WhatsApp chat. */
export function Services({ id, title, subtitle, services, whatsappNumber }: ServicesProps) {
  if (services.length === 0) return null;
  const headingId = `services-${id}`;
  return (
    <Section id="services" tone="muted" labelledBy={headingId} backdrop={GLOWS}>
      <SectionHeading id={headingId} title={title} subtitle={subtitle} reveal />
      <ul className="grid gap-3 md:gap-4">
        {services.map((service, index) => (
          <li key={service.id}>
            <a
              href={whatsappLink(
                whatsappNumber,
                `Hi Momento! I'd like to ask about ${service.title}.`,
              )}
              className="border-surface/70 bg-surface/55 focus-visible:outline-ring group flex items-center gap-4 rounded-lg border p-3 backdrop-blur-md transition-transform duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:hover:-translate-y-1 md:gap-8 md:p-4"
            >
              <span className="bg-surface relative block size-20 shrink-0 overflow-hidden rounded-md md:size-24">
                {service.image ? (
                  <Image src={service.image} alt="" fill sizes="96px" className="object-cover" />
                ) : (
                  <PhotoScene scene={SCENES[index % SCENES.length] ?? "travel"} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-heading block text-xl font-semibold md:text-2xl">
                  {service.title}
                </span>
                <span className="text-muted-foreground mt-1 line-clamp-2 block max-w-xl">
                  {service.description}
                </span>
              </span>
              <span className="text-ink hidden shrink-0 text-right sm:block">
                {service.startingPrice !== undefined && (
                  <span className="block font-medium">From {formatNpr(service.startingPrice)}</span>
                )}
                <span className="text-brand text-sm font-medium underline underline-offset-4">
                  Ask on WhatsApp
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </Section>
  );
}
