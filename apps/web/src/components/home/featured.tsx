import Link from "next/link";
import type { ProductCardData } from "@/lib/home";
import { ProductCarousel } from "./product-carousel";
import { Section } from "./section";

interface FeaturedProps {
  id: string;
  title: string;
  subtitle?: string;
  products: ProductCardData[];
}

export function Featured({ id, title, subtitle, products }: FeaturedProps) {
  if (products.length === 0) return null;
  const headingId = `featured-${id}`;
  return (
    <Section id="products" labelledBy={headingId} sectionClassName="overflow-x-clip">
      <ProductCarousel
        headingId={headingId}
        title={title}
        subtitle={subtitle}
        products={products.slice(0, 10)}
      />
      <p className="mt-6">
        <Link
          href="/shop"
          className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center font-medium underline underline-offset-4 focus-visible:outline-2"
        >
          See every product
        </Link>
      </p>
    </Section>
  );
}
