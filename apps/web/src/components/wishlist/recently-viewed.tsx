"use client";

import { useEffect } from "react";
import { useFeature } from "@/components/features/features-provider";
import { ProductGrid } from "@/components/shop/product-grid";
import { MAX_RECENT, pushRecent } from "@/lib/id-list";
import { toProductCard } from "@/lib/product-card";
import { useProductsByIds } from "@/lib/use-products-by-ids";
import { useRecentlyViewed } from "@/lib/wishlist";

const SHOWN = 4;

/** Remembers that this product was opened. Renders nothing. Off while `recentlyViewed` is off. */
export function RecordView({ productId }: { productId: string }) {
  const enabled = useFeature("recentlyViewed");
  const { update } = useRecentlyViewed();
  useEffect(() => {
    if (enabled) update((current) => pushRecent(current, productId, MAX_RECENT));
  }, [enabled, productId, update]);
  return null;
}

/** A row of the last few products this visitor opened. Hidden when there is nothing to show. */
export function RecentlyViewed({
  excludeId,
  className,
}: {
  excludeId?: string;
  className?: string;
}) {
  const enabled = useFeature("recentlyViewed");
  const { list } = useRecentlyViewed();
  const ids = enabled ? list.filter((id) => id !== excludeId).slice(0, SHOWN) : [];
  const { products } = useProductsByIds(ids);
  if (!enabled || products.length === 0) return null;
  return (
    <section aria-labelledby="recent-title" className={className}>
      <h2 id="recent-title" className="mb-6 text-2xl font-semibold md:text-3xl">
        Recently viewed
      </h2>
      <ProductGrid products={products.map((product) => toProductCard(product, new Map()))} />
    </section>
  );
}
