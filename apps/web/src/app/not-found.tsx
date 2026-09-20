import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Any address that does not exist (a mistyped link, a product that was removed). */
export default function NotFound() {
  return (
    <main className="bg-paper text-ink flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="text-brand text-sm font-semibold uppercase tracking-wide">Error 404</p>
        <h1 className="mt-2 text-3xl font-semibold">We could not find that page</h1>
        <p className="text-muted-foreground mt-3">
          The link may be old or mistyped. You can look through the shop, or message us on WhatsApp
          and we will help.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className={cn(buttonVariants())}>
            Browse the shop
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
