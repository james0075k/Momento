import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { ProductPurchase } from "@/components/product/product-purchase";
import { RichText } from "@/components/product/rich-text";
import { ReviewsSection } from "@/components/product/reviews-section";
import { ApiUnavailable } from "@/components/layout/api-unavailable";
import { apiLooksDown } from "@/lib/api";
import { AnswerBox } from "@/components/seo/answer-box";
import { FaqList } from "@/components/seo/faq-list";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductGrid } from "@/components/shop/product-grid";
import { getOccasion } from "@/config/occasions";
import { productAnswer } from "@/lib/answers";
import { breadcrumbLd, faqLd, productLd } from "@/lib/jsonld";
import { absoluteUrl } from "@/lib/site";
import { RecentlyViewed, RecordView } from "@/components/wishlist/recently-viewed";
import { ShareButtons } from "@/components/shop/share-buttons";
import { isFeatureOn } from "@momento/shared";
import { buildMetadata } from "@/lib/seo";
import {
  getAlsoBought,
  getCategories,
  getProduct,
  getProductReviews,
  getRelatedProducts,
  getSettings,
} from "@/lib/catalog";
import { plainText } from "@/lib/format";
import { toProductCard } from "@/lib/product-card";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found", robots: { index: false } };
  return buildMetadata({
    title: product.seoTitle ?? product.title,
    description:
      product.seoDescription ??
      (plainText(product.shortDescription || product.description, 160) || undefined),
    path: `/shop/${product.slug}`,
    image: product.images[0],
  });
}

export default async function ProductPage({ params }: Params) {
  const product = await getProduct((await params).slug);
  if (!product) {
    // An outage is not a missing product: say so, and do not cache it.
    if (apiLooksDown()) return <ApiUnavailable />;
    notFound();
  }

  const [categories, { reviews, summary }, related] = await Promise.all([
    getCategories(),
    getProductReviews(product.id),
    getRelatedProducts(product, 3),
  ]);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const categoryName = categoryNames.get(product.categoryId);
  // Flag `alsoBought`: with it off, this stays empty and the page is exactly as before.
  const alsoBought = isFeatureOn(await getSettings(), "alsoBought")
    ? await getAlsoBought(product.id)
    : [];
  const alsoBoughtIds = new Set(alsoBought.map((item) => item.id));
  const relatedShown = related.filter((item) => !alsoBoughtIds.has(item.id));
  const category = categories.find((entry) => entry.id === product.categoryId);

  const occasions = product.occasions.flatMap((slug) => getOccasion(slug) ?? []);

  return (
    <PageShell hideStickyBar>
      <JsonLd
        data={[
          productLd({
            product,
            categoryName,
            rating: summary ? { average: summary.average, count: summary.count } : null,
            reviews,
          }),
          breadcrumbLd([
            { name: "Shop", path: "/shop" },
            ...(category ? [{ name: category.name, path: `/shop?category=${category.slug}` }] : []),
            { name: product.title, path: `/shop/${product.slug}` },
          ]),
          ...(product.faqs.length > 0 ? [faqLd(product.faqs)] : []),
        ]}
      />
      <RecordView productId={product.id} />
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
        <nav aria-label="Breadcrumb" className="text-muted-foreground mb-5 text-sm">
          <ol className="flex flex-wrap items-center gap-x-2">
            <li>
              <Link href="/shop" className="inline-flex min-h-8 items-center hover:underline">
                Shop
              </Link>
            </li>
            {category && (
              <li className="flex items-center gap-x-2">
                <span aria-hidden>/</span>
                <Link
                  href={`/shop?category=${category.slug}`}
                  className="inline-flex min-h-8 items-center hover:underline"
                >
                  {category.name}
                </Link>
              </li>
            )}
            <li aria-current="page" className="flex items-center gap-x-2">
              <span aria-hidden>/</span>
              {product.title}
            </li>
          </ol>
        </nav>

        <AnswerBox>{productAnswer(product, categoryName)}</AnswerBox>

        <ProductPurchase
          product={{
            id: product.id,
            slug: product.slug,
            title: product.title,
            shortDescription: product.shortDescription,
            images: product.images,
            basePrice: product.basePrice,
            variants: product.variants,
            categoryName,
          }}
          rating={summary ? { average: summary.average, count: summary.count } : null}
        />

        <ShareButtons
          url={absoluteUrl(`/shop/${product.slug}`)}
          title={product.title}
          className="mt-6"
        />

        {(product.description || product.highlights.length > 0) && (
          <section aria-labelledby="about-title" className="mt-14 md:mt-20">
            <h2 id="about-title" className="mb-5 text-2xl font-semibold md:text-3xl">
              About this product
            </h2>
            {product.highlights.length > 0 && (
              <ul className="mb-6 grid max-w-3xl gap-2 sm:grid-cols-2">
                {product.highlights.map((highlight) => (
                  <li key={highlight} className="bg-surface rounded-xl px-4 py-3 font-medium">
                    {highlight}
                  </li>
                ))}
              </ul>
            )}
            {product.description && <RichText html={product.description} />}
          </section>
        )}

        {product.specs.length > 0 && (
          <section aria-labelledby="specs-title" className="mt-14 md:mt-20">
            <h2 id="specs-title" className="mb-5 text-2xl font-semibold md:text-3xl">
              Specifications
            </h2>
            <table className="bg-surface w-full max-w-3xl overflow-hidden rounded-2xl text-left">
              <tbody>
                {product.specs.map((spec) => (
                  <tr key={spec.label} className="border-ink/10 border-b last:border-b-0">
                    <th scope="row" className="w-2/5 px-4 py-3 align-top font-semibold">
                      {spec.label}
                    </th>
                    <td className="px-4 py-3">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {product.faqs.length > 0 && (
          <section aria-labelledby="faq-title" className="mt-14 md:mt-20">
            <h2 id="faq-title" className="mb-5 text-2xl font-semibold md:text-3xl">
              Questions about {product.title}
            </h2>
            <FaqList faqs={product.faqs} />
          </section>
        )}

        {occasions.length > 0 && (
          <p className="text-muted-foreground mt-14 max-w-3xl md:mt-20">
            Great for:{" "}
            {occasions.map((occasion, index) => (
              <span key={occasion.slug}>
                {index > 0 && ", "}
                <Link href={`/occasions/${occasion.slug}`} className="text-brand underline">
                  {occasion.name.toLowerCase()} gifts
                </Link>
              </span>
            ))}
            . New to ordering? See{" "}
            <Link href="/how-it-works" className="text-brand underline">
              how it works
            </Link>{" "}
            or read the{" "}
            <Link href="/faq" className="text-brand underline">
              common questions
            </Link>
            .
          </p>
        )}

        <div className="mt-14 md:mt-20">
          <ReviewsSection productId={product.id} reviews={reviews} summary={summary} />
        </div>

        {alsoBought.length > 0 && (
          <section aria-labelledby="also-bought-title" className="mt-14 md:mt-20">
            <h2 id="also-bought-title" className="mb-6 text-2xl font-semibold md:text-3xl">
              Customers also bought
            </h2>
            <ProductGrid products={alsoBought.map((item) => toProductCard(item, categoryNames))} />
          </section>
        )}

        {relatedShown.length > 0 && (
          <section aria-labelledby="related-title" className="mt-14 md:mt-20">
            <h2 id="related-title" className="mb-6 text-2xl font-semibold md:text-3xl">
              You might also like
            </h2>
            <ProductGrid
              products={relatedShown.map((item) => toProductCard(item, categoryNames))}
            />
          </section>
        )}
        <RecentlyViewed excludeId={product.id} className="mt-14 md:mt-20" />
      </div>
    </PageShell>
  );
}
