import { MessageCircle } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

/** Thumb-reach order button, phones only. Fixed position, so it never shifts the layout. */
export function StickyWhatsApp({ whatsappNumber }: { whatsappNumber: string }) {
  return (
    <div className="bg-paper/70 border-ink/10 fixed inset-x-0 bottom-0 z-40 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl md:hidden">
      <a
        href={whatsappLink(whatsappNumber)}
        className={cn(buttonVariants({ size: "lg" }), "h-12 w-full")}
      >
        <MessageCircle aria-hidden />
        Order on WhatsApp
      </a>
    </div>
  );
}
