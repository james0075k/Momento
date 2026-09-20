import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { orderCodeSchema } from "@momento/shared";
import { OrderConfirmation } from "@/components/cart/order-confirmation";
import { PageShell } from "@/components/layout/page-shell";
import { getSettings } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Order placed",
  robots: { index: false },
};

export default async function OrderPage({ params }: { params: Promise<{ code: string }> }) {
  const parsed = orderCodeSchema.safeParse((await params).code);
  if (!parsed.success) notFound();
  const settings = await getSettings();
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <OrderConfirmation code={parsed.data} settings={settings} />
      </div>
    </PageShell>
  );
}
