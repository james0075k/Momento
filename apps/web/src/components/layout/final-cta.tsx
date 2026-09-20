import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

export function FinalCta({ whatsappNumber }: { whatsappNumber: string }) {
  return (
    <section aria-labelledby="cta-title" className="bg-brand text-surface py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <h2
          id="cta-title"
          className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight md:text-6xl"
        >
          Your best photos are still on your phone.
        </h2>
        <p className="mt-5 max-w-md text-lg">
          Message us on WhatsApp with a few photos and we will suggest the right keepsake and price.
        </p>
        <a
          href={whatsappLink(whatsappNumber)}
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "border-surface mt-8 h-12 w-full sm:w-auto",
          )}
        >
          <MessageCircle aria-hidden />
          Order on WhatsApp
        </a>
      </div>
    </section>
  );
}
