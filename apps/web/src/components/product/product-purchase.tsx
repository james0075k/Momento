"use client";

import type { ProductVariant } from "@momento/shared";
import { Check, ShoppingBag } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Stars } from "@/components/home/stars";
import { buttonVariants } from "@/components/ui/button";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { variantLabel } from "@/lib/cart";
import { formatNpr } from "@/lib/format";
import { useCart } from "@/lib/use-cart";
import { cn } from "@/lib/utils";
import { pickVariant, variantGroups } from "@/lib/variants";
import { Gallery } from "./gallery";
import { RoomMockup } from "./room-mockup";

export interface PurchaseProduct {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  images: string[];
  basePrice: number;
  variants: ProductVariant[];
  categoryName?: string;
}

interface ProductPurchaseProps {
  product: PurchaseProduct;
  rating: { average: number; count: number } | null;
}

/** The price slides in like a tag whenever the variant changes. Opacity and transform only. */
function Price({ amount }: { amount: number }) {
  return (
    <span className="relative inline-flex h-10 items-center overflow-hidden text-3xl font-semibold tabular-nums">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={amount}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          aria-live="polite"
        >
          {formatNpr(amount)}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function ProductPurchase({ product, rating }: ProductPurchaseProps) {
  const router = useRouter();
  const cart = useCart();
  const groups = useMemo(() => variantGroups(product.variants), [product.variants]);
  const [variant, setVariant] = useState<ProductVariant | undefined>(product.variants[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  const unitPrice = variant?.price ?? product.basePrice;

  const addToCart = () => {
    cart.add({
      productId: product.id,
      variantId: variant?.id,
      quantity,
      title: product.title,
      slug: product.slug,
      image: product.images[0],
      variantLabel: variant ? variantLabel(variant) : undefined,
      unitPrice,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
    toast.success(`Added ${quantity} to your cart`, {
      action: { label: "View cart", onClick: () => router.push("/cart") },
    });
  };

  const buyNow = () => {
    addToCart();
    router.push("/checkout");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
        <div className="lg:sticky lg:top-[calc(6rem+var(--banner-h,0px))] lg:self-start">
          <Gallery images={product.images} title={product.title} />
        </div>

        <div>
          {product.categoryName && (
            <p className="text-muted-foreground text-sm font-medium">{product.categoryName}</p>
          )}
          <h1 className="mt-1 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">
            {product.title}
          </h1>
          {rating && (
            <a
              href="#reviews"
              className="focus-visible:outline-ring mt-3 inline-flex min-h-11 items-center gap-2 focus-visible:outline-2"
            >
              <Stars rating={rating.average} />
              <span className="text-sm underline underline-offset-4">
                {rating.average.toFixed(1)} from {rating.count}{" "}
                {rating.count === 1 ? "review" : "reviews"}
              </span>
            </a>
          )}
          {product.shortDescription && (
            <p className="text-muted-foreground mt-3 max-w-prose text-lg">
              {product.shortDescription}
            </p>
          )}

          <div className="mt-6 flex items-baseline gap-3">
            <Price amount={unitPrice} />
            {quantity > 1 && (
              <span className="text-muted-foreground text-sm">
                {formatNpr(unitPrice * quantity)} for {quantity}
              </span>
            )}
          </div>

          {groups.map((group) => (
            <fieldset key={group.key} className="mt-6">
              <legend className="mb-2 font-semibold">{group.label}</legend>
              <div className="flex flex-wrap gap-2">
                {group.values.map((value) => {
                  const selected = variant?.[group.key] === value;
                  return (
                    <label
                      key={String(value)}
                      className={cn(
                        "focus-within:outline-ring inline-flex min-h-11 cursor-pointer items-center rounded-full border px-4 text-sm font-medium transition-colors focus-within:outline-2 focus-within:outline-offset-2",
                        selected
                          ? "border-ink bg-ink text-surface"
                          : "border-ink/15 bg-surface hover:bg-muted",
                      )}
                    >
                      <input
                        type="radio"
                        name={group.key}
                        className="sr-only"
                        checked={selected}
                        onChange={() =>
                          setVariant(pickVariant(product.variants, variant, group.key, value))
                        }
                      />
                      {group.key === "pages" ? `${value} pages` : value}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <QuantityStepper value={quantity} onChange={setQuantity} />
            <button
              type="button"
              onClick={addToCart}
              className={cn(buttonVariants({ size: "lg" }), "h-12 min-w-44 flex-1")}
            >
              {added ? <Check aria-hidden /> : <ShoppingBag aria-hidden />}
              {added ? "Added" : "Add to cart"}
            </button>
          </div>
          <button
            type="button"
            onClick={buyNow}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "mt-3 h-12 w-full")}
          >
            Buy now
          </button>
          <p className="text-muted-foreground mt-4 text-sm">
            Pay after ordering: we send the payment details on WhatsApp.
          </p>
        </div>
      </div>

      <section aria-labelledby="mockup-title" className="mt-14 md:mt-20">
        <h2 id="mockup-title" className="mb-5 text-2xl font-semibold md:text-3xl">
          See it on your wall
        </h2>
        <div className="max-w-3xl">
          <RoomMockup image={product.images[0]} title={product.title} size={variant?.size} />
        </div>
      </section>

      {/* Phones: price and Add to cart stay under the thumb. */}
      <div className="bg-paper/90 border-ink/10 fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl lg:hidden">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{product.title}</p>
          <p className="font-semibold tabular-nums">{formatNpr(unitPrice * quantity)}</p>
        </div>
        <button type="button" onClick={addToCart} className={cn(buttonVariants(), "h-12 px-6")}>
          {added ? <Check aria-hidden /> : <ShoppingBag aria-hidden />}
          {added ? "Added" : "Add to cart"}
        </button>
      </div>
    </MotionConfig>
  );
}
