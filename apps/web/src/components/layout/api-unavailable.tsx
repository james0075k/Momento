import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";
import { PageShell } from "@/components/layout/page-shell";
import { buttonVariants } from "@/components/ui/button";
import { getSettings } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

/**
 * Shown instead of a 404 when the shop's data could not be loaded (the API is down or restarting).
 * A missing product deserves a 404; a temporary outage does not, and must not be remembered as one.
 */
export async function ApiUnavailable() {
  // Never cache this page: it should disappear the moment the API is back.
  noStore();
  const settings = await getSettings();
  return (
    <PageShell>
      <div className="mx-auto max-w-2xl px-4 py-16 text-center md:px-8 md:py-24">
        <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
          The shop is taking a short break
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          We could not load this page just now. Please try again in a minute, or order on WhatsApp
          and we will help you right away.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12")}>
            Back to the home page
          </Link>
          <a
            href={whatsappLink(settings.shopWhatsappNumber)}
            className={cn(buttonVariants({ size: "lg" }), "h-12")}
          >
            <MessageCircle aria-hidden />
            Order on WhatsApp
          </a>
        </div>
      </div>
    </PageShell>
  );
}
