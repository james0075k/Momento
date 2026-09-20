import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { getServices } from "@/lib/catalog";
import { formatNpr, plainText } from "@/lib/format";
import { breadcrumbLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Photo services in Nepal",
  description:
    "Photo restoration, album design help, passport-size photos and event printing from Momento. See what each service costs and order on WhatsApp.",
  path: "/services",
});

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Services", path: "/services" },
];

export default async function ServicesPage() {
  const services = await getServices();
  return (
    <PageShell>
      <JsonLd data={breadcrumbLd(CRUMBS)} />
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <Breadcrumbs crumbs={CRUMBS} />
        <h1 className="mb-3 text-4xl font-semibold tracking-tight md:text-5xl">Our services</h1>
        <p className="text-muted-foreground mb-8 max-w-xl text-lg">
          More ways we can help with your photos, from repairing old prints to designing your album.
        </p>
        {services.length === 0 ? (
          <p className="text-muted-foreground">
            Our services are being updated. Message us on WhatsApp and we will help.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {services.map((service) => (
              <li key={service.id}>
                <Link
                  href={`/services/${service.slug}`}
                  className="bg-surface focus-visible:outline-ring flex min-h-24 gap-4 rounded-2xl p-4 focus-visible:outline-2"
                >
                  {service.image && (
                    <span className="relative block size-20 shrink-0 overflow-hidden rounded-lg">
                      <Image
                        src={service.image}
                        alt=""
                        fill
                        sizes="5rem"
                        className="object-cover"
                      />
                    </span>
                  )}
                  <span>
                    <span className="font-heading block text-xl font-semibold">
                      {service.title}
                    </span>
                    <span className="text-muted-foreground mt-1 line-clamp-2 block">
                      {plainText(service.description)}
                    </span>
                    {service.startingPrice !== undefined && (
                      <span className="mt-1 block font-medium">
                        From {formatNpr(service.startingPrice)}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
