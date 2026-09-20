import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { OCCASIONS } from "@/config/occasions";
import { breadcrumbLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Photo gifts by occasion",
  description:
    "Find a photo book, frame or print for weddings, Dashain, Tihar, babies and travel. Ideas, questions answered, and products printed in Nepal.",
  path: "/occasions",
});

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "Occasions", path: "/occasions" },
];

export default function OccasionsPage() {
  return (
    <PageShell>
      <JsonLd data={breadcrumbLd(CRUMBS)} />
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <Breadcrumbs crumbs={CRUMBS} />
        <h1 className="mb-3 text-4xl font-semibold tracking-tight md:text-5xl">
          Keepsakes for every occasion
        </h1>
        <p className="text-muted-foreground mb-8 max-w-xl text-lg">
          Pick the moment and we will show you what to make from it.
        </p>
        <ul className="grid gap-4 md:grid-cols-2">
          {OCCASIONS.map((occasion) => (
            <li key={occasion.slug}>
              <Link
                href={`/occasions/${occasion.slug}`}
                className="bg-surface focus-visible:outline-ring block min-h-24 rounded-2xl p-5 focus-visible:outline-2"
              >
                <span className="font-heading block text-2xl font-semibold">
                  {occasion.headline}
                </span>
                <span className="text-muted-foreground mt-2 block">{occasion.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
