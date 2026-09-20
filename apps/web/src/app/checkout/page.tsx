import type { Metadata } from "next";
import { CheckoutView } from "@/components/cart/checkout-view";
import { PageShell } from "@/components/layout/page-shell";
import { getSettings } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Checkout",
  robots: { index: false },
};

export default async function CheckoutPage() {
  const settings = await getSettings();
  return (
    <PageShell hideStickyBar>
      <div className="mx-auto max-w-6xl px-4 py-8 pb-28 md:px-8 md:py-12 lg:pb-12">
        <h1 className="mb-8 text-4xl font-semibold tracking-tight md:text-5xl">Checkout</h1>
        <CheckoutView settings={settings} />
      </div>
    </PageShell>
  );
}
