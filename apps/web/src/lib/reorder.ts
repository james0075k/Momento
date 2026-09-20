import type { Product } from "@momento/shared";
import { variantLabel, type CartLine } from "./cart";
import type { TrackedOrder } from "./orders";

export interface ReorderResult {
  lines: CartLine[];
  /** Titles of items that could not be added because the product or size is gone. */
  skipped: string[];
}

/**
 * Turns a past order into cart lines at today's prices. `products` maps a product id to the current
 * product, or null when it no longer exists. Products that are inactive, and sizes that were removed, are skipped.
 */
export function buildReorderLines(
  items: TrackedOrder["items"],
  products: Map<string, Product | null>,
): ReorderResult {
  const lines: CartLine[] = [];
  const skipped: string[] = [];
  for (const item of items) {
    const product = products.get(item.productId);
    if (!product || !product.isActive) {
      skipped.push(item.title);
      continue;
    }
    const variant = product.variants.find((candidate) => candidate.id === item.variantId);
    if (product.variants.length > 0 && !variant) {
      skipped.push(item.title);
      continue;
    }
    lines.push({
      productId: product.id,
      variantId: variant?.id,
      quantity: item.quantity,
      title: product.title,
      slug: product.slug,
      image: product.images[0],
      variantLabel: variant ? variantLabel(variant) : undefined,
      unitPrice: variant ? variant.price : product.basePrice,
    });
  }
  return { lines, skipped };
}
