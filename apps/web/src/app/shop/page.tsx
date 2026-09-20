import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { ProductGrid } from "@/components/shop/product-grid";
import { ShopFilters } from "@/components/shop/shop-filters";
import { buttonVariants } from "@/components/ui/button";
import { OCCASIONS } from "@/config/occasions";
import { getCategories, getShopProducts } from "@/lib/catalog";
import { toProductCard } from "@/lib/home";
import { buildMetadata } from "@/lib/seo";
import { parseShopQuery, shopSearch, type RawSearchParams } from "@/lib/shop-query";
import { cn } from "@/lib/utils";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}): Promise<Metadata> {
  const query = parseShopQuery(await searchParams);
  const occasion = OCCASIONS.find((item) => item.slug === query.occasion);
  // Filtered and searched views point their canonical at the plain shop, so they never compete with it.
  const filtered = Boolean(query.category || query.occasion || query.q || query.sort !== "newest");
  return buildMetadata({
    title: occasion ? `${occasion.name} keepsakes` : "Shop photo books, frames and prints",
    description:
      "Browse photo books, framed prints, magnets and canvases made in Nepal. Filter by category or occasion, see prices in NPR, and order on WhatsApp.",
    path: query.page > 1 && !filtered ? `/shop?page=${query.page}` : "/shop",
  });
}

function Pager({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pages" className="mt-12 flex items-center justify-between gap-3">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={buttonVariants({ variant: "outline" })}>
          Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground text-sm">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={hrefFor(page + 1)} className={buttonVariants({ variant: "outline" })}>
          Next
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const query = parseShopQuery(await searchParams);
  const [categories, result] = await Promise.all([getCategories(), getShopProducts(query)]);
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]));
  const cards = result.products.map((product) => toProductCard(product, categoryNames));

  const filtered = Boolean(query.category || query.occasion || query.q);
  const occasionName = OCCASIONS.find((item) => item.slug === query.occasion)?.name;

  return (
    <PageShell>
      <div className="bg-wash">
        <div className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            {occasionName ? `${occasionName} keepsakes` : "Shop"}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl text-lg">
            Photo books, frames, magnets and canvases, printed in Nepal.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <ShopFilters query={query} categories={categories} />

        <p className="text-muted-foreground mb-6 mt-8 text-sm" aria-live="polite">
          {result.ok
            ? `${result.total} ${result.total === 1 ? "product" : "products"}${query.q ? ` for "${query.q}"` : ""}`
            : ""}
        </p>

        {cards.length > 0 ? (
          <ProductGrid key={shopSearch(query)} products={cards} />
        ) : (
          <div className="border-ink/15 rounded-2xl border border-dashed px-6 py-14 text-center">
            <h2 className="text-2xl font-semibold">
              {result.ok ? "No products match" : "The shop is not loading right now"}
            </h2>
            <p className="text-muted-foreground mx-auto mt-2 max-w-md">
              {result.ok
                ? filtered
                  ? "Try a different word, or clear the filters to see everything."
                  : "New products are on their way. Message us on WhatsApp and we will help you choose."
                : "Please refresh in a minute. If it keeps happening, order on WhatsApp instead."}
            </p>
            {filtered && (
              <Link href="/shop" className={cn(buttonVariants(), "mt-6")}>
                Clear filters
              </Link>
            )}
          </div>
        )}

        <Pager
          page={query.page}
          totalPages={result.totalPages}
          hrefFor={(page) => `/shop${shopSearch({ ...query, page })}`}
        />
      </div>
    </PageShell>
  );
}
