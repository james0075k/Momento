"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useFeature } from "@/components/features/features-provider";
import { useWishlist } from "@/lib/wishlist";
import { cn } from "@/lib/utils";

/** Header heart with the number of saved products. Renders nothing while the `wishlist` flag is off. */
export function WishlistLink({ className }: { className?: string }) {
  const enabled = useFeature("wishlist");
  const { list } = useWishlist();
  if (!enabled) return null;
  return (
    <Link
      href="/wishlist"
      aria-label={list.length > 0 ? `Wishlist, ${list.length} saved` : "Wishlist"}
      className={cn(
        "relative inline-flex size-11 items-center justify-center focus-visible:outline-2",
        className,
      )}
    >
      <Heart aria-hidden className="size-6" />
      {list.length > 0 && (
        <span
          aria-hidden
          className="bg-brand text-surface absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold leading-5"
        >
          {list.length}
        </span>
      )}
    </Link>
  );
}
