import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { AnswerBox } from "@/components/seo/answer-box";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { FaqList } from "@/components/seo/faq-list";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductGrid } from "@/components/shop/product-grid";
import { buttonVariants } from "@/components/ui/button";
import { getOccasion, OCCASIONS } from "@/config/occasions";
import { getPost } from "@/content/blog";
import { getCategories, getShopProducts } from "@/lib/catalog";
import { toProductCard } from "@/lib/home";
import { breadcrumbLd, faqLd } from "@/lib/jsonld";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const revalidate = 300;

interface Params {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return OCCASIONS.map((occasion) => ({ slug: occasion.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const occasion = getOccasion((await params).slug);
  if (!occasion) return { title: "Occasion not found", robots: { index: false } };
  return buildMetadata({
    title: occasion.headline,
    description: occasion.description,
    path: `/occasions/${occasion.slug}`,
  });
}

export default async function OccasionPage({ params }: Params) {
  const occasion = getOccasion((await params).slug);
  if (!occasion) notFound();

  const [categories, result] = await Promise.all([
    getCategories(),
    getShopProducts({ occasion: occasion.slug, sort: "newest", page: 1 }),
  ]);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const posts = occasion.posts.flatMap((slug) => getPost(slug) ?? []);
  const crumbs = [
    { name: "Home", path: "/" },
    { name: "Occasions", path: "/occasions" },
    { name: occasion.name, path: `/occasions/${occasion.slug}` },
  ];

  return (
    <PageShell>
      <JsonLd data={[breadcrumbLd(crumbs), faqLd(occasion.faqs)]} />
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <Breadcrumbs crumbs={crumbs} />
        <h1 className="mb-6 text-4xl font-semibold tracking-tight md:text-5xl">
          {occasion.headline}
        </h1>
        <AnswerBox>{occasion.answer}</AnswerBox>

        <section aria-labelledby="ideas-title">
          <h2 id="ideas-title" className="mb-4 text-2xl font-semibold md:text-3xl">
            {occasion.name} gift ideas
          </h2>
          <ul className="grid max-w-4xl gap-3 sm:grid-cols-2">
            {occasion.ideas.map((idea) => (
              <li key={idea} className="bg-surface rounded-xl px-4 py-3">
                {idea}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="products-title" className="mt-14 md:mt-20">
          <h2 id="products-title" className="mb-6 text-2xl font-semibold md:text-3xl">
            Shop {occasion.name.toLowerCase()} keepsakes
          </h2>
          {result.products.length > 0 ? (
            <>
              <ProductGrid
                products={result.products.map((product) => toProductCard(product, categoryNames))}
              />
              <Link
                href={`/shop?occasion=${occasion.slug}`}
                className={cn(buttonVariants({ variant: "outline" }), "mt-8")}
              >
                See all {occasion.name.toLowerCase()} products
              </Link>
            </>
          ) : (
            <p className="text-muted-foreground max-w-prose">
              New {occasion.name.toLowerCase()} products are on their way. Browse the{" "}
              <Link href="/shop" className="text-brand underline">
                full shop
              </Link>{" "}
              or message us on WhatsApp and we will help you choose.
            </p>
          )}
        </section>

        <section aria-labelledby="faq-title" className="mt-14 md:mt-20">
          <h2 id="faq-title" className="mb-5 text-2xl font-semibold md:text-3xl">
            {occasion.name} questions
          </h2>
          <FaqList faqs={occasion.faqs} />
        </section>

        <section aria-labelledby="more-title" className="mt-14 md:mt-20">
          <h2 id="more-title" className="mb-4 text-2xl font-semibold md:text-3xl">
            Keep reading
          </h2>
          <ul className="max-w-3xl space-y-2">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/blog/${post.slug}`} className="text-brand underline">
                  {post.title}
                </Link>
              </li>
            ))}
            {OCCASIONS.filter((other) => other.slug !== occasion.slug).map((other) => (
              <li key={other.slug}>
                <Link href={`/occasions/${other.slug}`} className="text-brand underline">
                  {other.headline}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/how-it-works" className="text-brand underline">
                How ordering works
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </PageShell>
  );
}
