import type { HomeSection } from "@momento/shared";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FinalCta } from "@/components/layout/final-cta";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SmoothScroll } from "@/components/layout/smooth-scroll";
import { StickyWhatsApp } from "@/components/layout/sticky-whatsapp";
import { Features } from "@/components/home/features";
import { Featured } from "@/components/home/featured";
import { Guarantees } from "@/components/home/guarantees";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { Occasions } from "@/components/home/occasions";
import { Premium } from "@/components/home/premium";
import { Reviews } from "@/components/home/reviews";
import { Services } from "@/components/home/services";
import { TrustMarquee } from "@/components/home/trust-marquee";
import { Statement } from "@/components/home/stats";
import { JsonLd } from "@/components/seo/json-ld";
import { FaqList } from "@/components/seo/faq-list";
import { siteFaqs } from "@/content/faq";
import { getSettings } from "@/lib/catalog";
import { getHomeData, orderByRefs, prioritizeByRefs, type HomeData } from "@/lib/home";
import { faqLd, localBusinessLd, organizationLd, websiteLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSettings();
  return buildMetadata({
    title: seo.defaultTitle ?? `${SITE_NAME}: ${SITE_TAGLINE}`,
    description: seo.defaultDescription,
    image: seo.ogImage,
    path: "/",
    absoluteTitle: true,
  });
}

/**
 * One HomeSection document renders its own block plus the static blocks that belong with it,
 * so moving a section in the admin moves the pair:
 * hero + strip and statement, featured + smart features, reviews + premium, guarantees + how it works.
 */
function renderSection(section: HomeSection, data: HomeData): ReactNode {
  const whatsappNumber = data.settings.shopWhatsappNumber;
  const common = { id: section.id, title: section.title, subtitle: section.subtitle };

  switch (section.type) {
    case "hero":
      return (
        <div key={section.id}>
          <Hero title={section.title} subtitle={section.subtitle} />
          <div className="bg-wash">
            <TrustMarquee />
            <Statement />
          </div>
        </div>
      );
    case "featured":
      return (
        <div key={section.id}>
          <Featured {...common} products={orderByRefs(data.products, section.itemRefs)} />
          <Features />
        </div>
      );
    case "services":
      return (
        <Services
          key={section.id}
          {...common}
          services={prioritizeByRefs(data.services, section.itemRefs)}
          whatsappNumber={whatsappNumber}
        />
      );
    case "reviews":
      return (
        <div key={section.id}>
          <Reviews
            {...common}
            reviews={reviewsFor(section, data)}
            stats={data.reviewStats}
            productTotal={data.productTotal}
          />
          <Premium />
        </div>
      );
    case "guarantees":
      return (
        <div key={section.id}>
          <HowItWorks />
          <Guarantees {...common} />
        </div>
      );
    case "gallery":
      return <Occasions key={section.id} {...common} />;
  }
}

function reviewsFor(section: HomeSection, data: HomeData) {
  return section.itemRefs.length > 0
    ? orderByRefs(data.reviews, section.itemRefs)
    : data.reviews.slice(0, 10);
}

export default async function HomePage() {
  const data = await getHomeData();
  const whatsappNumber = data.settings.shopWhatsappNumber;
  const sections = [...data.sections].sort((a, b) => a.order - b.order);
  const faqs = siteFaqs(data.settings);

  return (
    <>
      <JsonLd
        data={[
          organizationLd(data.settings),
          localBusinessLd(data.settings),
          websiteLd(),
          faqLd(faqs),
        ]}
      />
      <SmoothScroll />
      <SiteHeader whatsappNumber={whatsappNumber} />
      <main>
        {sections.map((section) => renderSection(section, data))}
        <section aria-labelledby="home-faq-title" className="bg-paper text-ink py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 md:px-8">
            <h2
              id="home-faq-title"
              className="mb-8 text-3xl font-semibold tracking-tight md:text-4xl"
            >
              Questions people ask us
            </h2>
            <FaqList faqs={faqs} />
          </div>
        </section>
      </main>
      <FinalCta whatsappNumber={whatsappNumber} />
      <SiteFooter socialLinks={data.settings.socialLinks} />
      <StickyWhatsApp whatsappNumber={whatsappNumber} />
    </>
  );
}
