import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";
import { RecentlyViewed } from "@/components/wishlist/recently-viewed";
import { PageShell } from "@/components/layout/page-shell";
import { getSettings } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Your cart",
  robots: { index: false },
};

export default async function CartPage() {
  const settings = await getSettings();
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <h1 className="mb-8 text-4xl font-semibold tracking-tight md:text-5xl">Your cart</h1>
        <CartView deliveryFees={settings.deliveryFees} />
        <RecentlyViewed className="mt-14 md:mt-20" />
      </div>
    </PageShell>
  );
}
