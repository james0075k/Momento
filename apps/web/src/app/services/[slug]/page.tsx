import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApiUnavailable } from "@/components/layout/api-unavailable";
import { apiLooksDown } from "@/lib/api";
import { PageShell } from "@/components/layout/page-shell";
import { RichText } from "@/components/product/rich-text";
import { AnswerBox } from "@/components/seo/answer-box";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { FaqList } from "@/components/seo/faq-list";
import { JsonLd } from "@/components/seo/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { serviceAnswer } from "@/lib/answers";
import { getService, getSettings } from "@/lib/catalog";
import { formatNpr, plainText } from "@/lib/format";
import { breadcrumbLd, faqLd, serviceLd, type FaqItem } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";
import { DELIVERY } from "@/lib/site";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

export const revalidate = 300;

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const service = await getService((await params).slug);
  if (!service) return { title: "Service not found", robots: { index: false } };
  return buildMetadata({
    title: service.title,
    description: plainText(service.description, 160) || undefined,
    path: `/services/${service.slug}`,
    image: service.image,
  });
}

const serviceFaqs = (title: string, startingPrice?: number): FaqItem[] => [
  {
    question: `How much does ${title.toLowerCase()} cost?`,
    answer:
      startingPrice !== undefined
        ? `${title} starts from ${formatNpr(startingPrice)}. The final price depends on what you need, and we confirm it on WhatsApp before you pay.`
        : "The price depends on what you need. Message us on WhatsApp and we confirm it before you pay.",
  },
  {
    question: `How do I order ${title.toLowerCase()}?`,
    answer:
      "Message us on WhatsApp with what you need and send your photos as documents. We reply with a price and a delivery date, and you pay by eSewa, Khalti or bank transfer once you agree.",
  },
  {
    question: "How long does it take?",
    answer: `We deliver ${DELIVERY.insideValley} and ${DELIVERY.outsideValley}. We confirm the exact date when we confirm your order.`,
  },
];

export default async function ServicePage({ params }: Params) {
  const { slug } = await params;
  const [service, settings] = await Promise.all([getService(slug), getSettings()]);
  if (!service) {
    if (apiLooksDown()) return <ApiUnavailable />;
    notFound();
  }

  const faqs = serviceFaqs(service.title, service.startingPrice);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Services", path: "/services" },
    { name: service.title, path: `/services/${service.slug}` },
  ];

  return (
    <PageShell>
      <JsonLd data={[serviceLd(service), breadcrumbLd(crumbs), faqLd(faqs)]} />
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="mb-6 text-4xl font-semibold tracking-tight md:text-5xl">{service.title}</h1>
        <AnswerBox>{serviceAnswer(service)}</AnswerBox>

        <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
          <div>
            {service.description && <RichText html={service.description} />}
            <a
              href={whatsappLink(
                settings.shopWhatsappNumber,
                `Hi Momento! I'd like to ask about ${service.title}.`,
              )}
              className={cn(buttonVariants({ size: "lg" }), "mt-8 h-12")}
            >
              <MessageCircle aria-hidden />
              Ask on WhatsApp
            </a>
          </div>
          {service.image && (
            <div className="bg-surface relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src={service.image}
                alt={`${service.title} by Momento`}
                fill
                priority
                sizes="(min-width: 768px) 32rem, 100vw"
                className="object-cover"
              />
            </div>
          )}
        </div>

        <section aria-labelledby="service-faq" className="mt-14 md:mt-20">
          <h2 id="service-faq" className="mb-5 text-2xl font-semibold md:text-3xl">
            Questions about {service.title.toLowerCase()}
          </h2>
          <FaqList faqs={faqs} />
        </section>

        <p className="text-muted-foreground mt-10 max-w-prose">
          See{" "}
          <Link href="/services" className="text-brand underline">
            all services
          </Link>
          , our{" "}
          <Link href="/shop" className="text-brand underline">
            photo books, frames and prints
          </Link>
          , or{" "}
          <Link href="/how-it-works" className="text-brand underline">
            how ordering works
          </Link>
          .
        </p>
      </div>
    </PageShell>
  );
}
