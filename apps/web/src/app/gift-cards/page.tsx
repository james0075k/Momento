import { MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/layout/page-shell";
import { GiftCardChecker } from "@/components/promotions/gift-card-checker";
import { buttonVariants } from "@/components/ui/button";
import { getSettings } from "@/lib/catalog";
import { buildMetadata } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";
import { isFeatureOn } from "@momento/shared";

export const metadata: Metadata = buildMetadata({
  title: "Gift cards",
  description:
    "Give a Momento gift card for photo books, frames and prints. Buy one on WhatsApp, use it at checkout, and check the balance any time.",
  path: "/gift-cards",
});

export default async function GiftCardsPage() {
  const settings = await getSettings();
  // With the flag off this page does not exist, exactly as before the feature was added.
  if (!isFeatureOn(settings, "giftCards")) notFound();
  return (
    <PageShell>
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-12">
        <h1 className="mb-4 text-4xl font-semibold tracking-tight md:text-5xl">Gift cards</h1>
        <p className="text-muted-foreground mb-8 max-w-prose text-lg">
          Not sure which photo book or frame to pick? Give a Momento gift card and let them choose.
          It works on any order, and pays for delivery too.
        </p>

        <ol className="mb-10 max-w-prose list-decimal space-y-2 pl-5 text-lg">
          <li>Message us on WhatsApp with the amount you want (from NPR 100).</li>
          <li>Pay by eSewa, Khalti or bank transfer, as with any order.</li>
          <li>We send you the gift card code to pass on. They enter it at checkout.</li>
        </ol>
        <a
          href={whatsappLink(
            settings.shopWhatsappNumber,
            "Hi Momento! I'd like to buy a gift card.",
          )}
          className={cn(buttonVariants({ size: "lg" }), "mb-14 h-12")}
        >
          <MessageCircle aria-hidden />
          Buy a gift card on WhatsApp
        </a>

        <h2 className="mb-4 text-2xl font-semibold md:text-3xl">Check a balance</h2>
        <GiftCardChecker />
      </div>
    </PageShell>
  );
}
