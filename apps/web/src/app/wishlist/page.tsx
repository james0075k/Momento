import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { WishlistView } from "@/components/wishlist/wishlist-view";
import { featureEnabled } from "@/lib/catalog";
import { noindexMetadata } from "@/lib/seo";

export const metadata: Metadata = noindexMetadata("Your wishlist");

export default async function WishlistPage() {
  // With the flag off this page does not exist, exactly as before the feature was added.
  if (!(await featureEnabled("wishlist"))) notFound();
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <h1 className="mb-8 text-4xl font-semibold tracking-tight md:text-5xl">Your wishlist</h1>
        <WishlistView />
      </div>
    </PageShell>
  );
}
