"use client";

import Link from "next/link";
import { ProductGrid } from "@/components/shop/product-grid";
import { buttonVariants } from "@/components/ui/button";
import { toProductCard } from "@/lib/product-card";
import { useProductsByIds } from "@/lib/use-products-by-ids";
import { useWishlist } from "@/lib/wishlist";

/** The saved products. The list lives in this browser only, and the page says so. */
export function WishlistView() {
  const { list } = useWishlist();
  const { products, loading, failed } = useProductsByIds(list);
  const noCategories = new Map<string, string>();

  if (list.length === 0) {
    return (
      <div className="border-ink/15 rounded-2xl border border-dashed px-6 py-14 text-center">
        <h2 className="text-2xl font-semibold">Nothing saved yet</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-md">
          Tap the heart on any product to keep it here for later.
        </p>
        <Link href="/shop" className={buttonVariants({ className: "mt-6" })}>
          Browse the shop
        </Link>
      </div>
    );
  }
  if (loading) {
    return (
      <p role="status" className="text-muted-foreground">
        Loading your saved products
      </p>
    );
  }
  if (failed) {
    return (
      <p role="alert" className="text-brand">
        We could not load your saved products. Please refresh in a minute.
      </p>
    );
  }
  return (
    <>
      <ProductGrid products={products.map((product) => toProductCard(product, noCategories))} />
      <p className="text-muted-foreground mt-8 text-sm">
        Your wishlist is saved on this device only. It is not linked to an account, and clearing
        your browser data removes it.
      </p>
    </>
  );
}
