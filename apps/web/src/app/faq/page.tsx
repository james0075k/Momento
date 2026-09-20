import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { AnswerBox } from "@/components/seo/answer-box";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { FaqList } from "@/components/seo/faq-list";
import { JsonLd } from "@/components/seo/json-ld";
import { siteFaqs } from "@/content/faq";
import { getSettings } from "@/lib/catalog";
import { breadcrumbLd, faqLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildMetadata({
  title: "Frequently asked questions",
  description:
    "Answers about ordering photo books, frames and prints from Momento: delivery times and fees, payment by eSewa, Khalti or bank, sending photos and reprints.",
  path: "/faq",
});

const CRUMBS = [
  { name: "Home", path: "/" },
  { name: "FAQ", path: "/faq" },
];

export default async function FaqPage() {
  const faqs = siteFaqs(await getSettings());
  return (
    <PageShell>
      <JsonLd data={[faqLd(faqs), breadcrumbLd(CRUMBS)]} />
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <Breadcrumbs crumbs={CRUMBS} />
        <h1 className="mb-6 text-4xl font-semibold tracking-tight md:text-5xl">
          Frequently asked questions
        </h1>
        <AnswerBox>
          You order on our website or WhatsApp, send your photos, approve the layout and pay by
          eSewa, Khalti or bank transfer once we confirm. We print in Nepal and deliver in two to
          three working days in Kathmandu Valley. Below are the questions we hear most.
        </AnswerBox>
        <FaqList faqs={faqs} />
        <p className="text-muted-foreground mt-10 max-w-prose">
          Still unsure? See{" "}
          <Link href="/how-it-works" className="text-brand underline">
            how it works
          </Link>
          , browse the{" "}
          <Link href="/shop" className="text-brand underline">
            shop
          </Link>
          , or message us on WhatsApp.
        </p>
      </div>
    </PageShell>
  );
}
