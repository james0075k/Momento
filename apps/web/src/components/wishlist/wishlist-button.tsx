"use client";

import { Heart } from "lucide-react";
import { useFeature } from "@/components/features/features-provider";
import { MAX_WISHLIST, toggleId } from "@/lib/id-list";
import { useWishlist } from "@/lib/wishlist";
import { cn } from "@/lib/utils";

/** Heart toggle. Renders nothing while the `wishlist` flag is off. */
export function WishlistButton({
  productId,
  title,
  className,
}: {
  productId: string;
  title: string;
  className?: string;
}) {
  const enabled = useFeature("wishlist");
  const { list, update } = useWishlist();
  if (!enabled) return null;
  const saved = list.includes(productId);
  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from wishlist` : `Save ${title} to wishlist`}
      onClick={() => update((current) => toggleId(current, productId, MAX_WISHLIST))}
      className={cn(
        "bg-surface/90 text-ink focus-visible:outline-ring inline-flex size-11 items-center justify-center rounded-full shadow-sm backdrop-blur focus-visible:outline-2",
        className,
      )}
    >
      <Heart aria-hidden className={cn("size-5", saved && "fill-brand text-brand")} />
    </button>
  );
}
