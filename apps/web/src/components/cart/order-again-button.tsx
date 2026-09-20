"use client";

import type { Product } from "@momento/shared";
import { RotateCw } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useFeature } from "@/components/features/features-provider";
import { buttonVariants } from "@/components/ui/button";
import { ApiError, apiRequest } from "@/lib/api";
import type { TrackedOrder } from "@/lib/orders";
import { buildReorderLines } from "@/lib/reorder";
import { useCart } from "@/lib/use-cart";
import { cn } from "@/lib/utils";

/**
 * Puts the items of a past order back in the cart at today's prices. Products or sizes that are gone
 * are skipped and listed. Renders nothing while the `orderAgain` flag is off.
 */
export function OrderAgainButton({ items }: { items: TrackedOrder["items"] }) {
  const enabled = useFeature("orderAgain");
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: string[] } | null>(null);
  const [failed, setFailed] = useState(false);
  if (!enabled) return null;

  const run = async () => {
    setBusy(true);
    setFailed(false);
    setResult(null);
    try {
      const ids = [...new Set(items.map((item) => item.productId))];
      const found = await Promise.all(
        ids.map(async (id): Promise<[string, Product | null]> => {
          try {
            return [id, await apiRequest<Product>(`/products/${id}`)];
          } catch (error) {
            // A 404 means the product is gone. Anything else is a real failure, so stop and say so.
            if (error instanceof ApiError && error.status === 404) return [id, null];
            throw error;
          }
        }),
      );
      const { lines, skipped } = buildReorderLines(items, new Map(found));
      for (const line of lines) cart.add(line);
      setResult({ added: lines.length, skipped });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-surface rounded-2xl p-5">
      <h3 className="text-xl font-semibold">Want the same again?</h3>
      <p className="text-muted-foreground mt-1">
        We will add these items to your cart at today&apos;s prices.
      </p>
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy}
        className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-3 h-12")}
      >
        <RotateCw aria-hidden />
        {busy ? "Adding" : "Order again"}
      </button>
      <div aria-live="polite" className="mt-3 space-y-1">
        {result && result.added > 0 && (
          <p>
            Added {result.added} {result.added === 1 ? "item" : "items"} to your cart.{" "}
            <Link href="/cart" className="text-brand font-medium underline underline-offset-4">
              View your cart
            </Link>
          </p>
        )}
        {result && result.skipped.length > 0 && (
          <p className="text-muted-foreground text-sm">
            No longer available: {result.skipped.join(", ")}.
          </p>
        )}
        {failed && (
          <p role="alert" className="text-brand">
            We could not check the shop right now. Please try again in a minute.
          </p>
        )}
      </div>
    </div>
  );
}
