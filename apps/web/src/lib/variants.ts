import type { ProductVariant } from "@momento/shared";

export type VariantKey = "size" | "cover" | "pages";

export interface VariantGroup {
  key: VariantKey;
  label: string;
  values: Array<string | number>;
}

const LABELS: Record<VariantKey, string> = { size: "Size", cover: "Cover", pages: "Pages" };

/** The choices to show: one group per attribute that any variant defines, in first-seen order. */
export function variantGroups(variants: ProductVariant[]): VariantGroup[] {
  return (["size", "cover", "pages"] as const)
    .map((key) => {
      const values: Array<string | number> = [];
      for (const variant of variants) {
        const value = variant[key];
        if (value !== undefined && !values.includes(value)) values.push(value);
      }
      return { key, label: LABELS[key], values };
    })
    .filter((group) => group.values.length > 0);
}

/**
 * The variant to select after the customer taps `value` for `key`. Every chip is always
 * tappable: if the current combination does not exist, we move to the variant that shares
 * the most of the customer's other choices.
 */
export function pickVariant(
  variants: ProductVariant[],
  current: ProductVariant | undefined,
  key: VariantKey,
  value: string | number,
): ProductVariant | undefined {
  const candidates = variants.filter((variant) => variant[key] === value);
  if (!current) return candidates[0];
  const others = (["size", "cover", "pages"] as const).filter((other) => other !== key);
  const score = (variant: ProductVariant) =>
    others.filter((other) => variant[other] === current[other]).length;
  return candidates.reduce<ProductVariant | undefined>(
    (best, variant) => (best === undefined || score(variant) > score(best) ? variant : best),
    undefined,
  );
}

const A_SERIES: Record<string, number> = { a6: 0.28, a5: 0.4, a4: 0.55, a3: 0.75, a2: 1 };

/**
 * How big a size label looks next to the others, from 0.25 (small) to 1 (large).
 * Understands "A4" and "8x10" / "12 x 16 in" style labels; anything else is medium.
 */
export function sizeScale(size: string): number {
  const iso = A_SERIES[size.trim().toLowerCase().slice(0, 2)];
  if (iso !== undefined) return iso;
  const numbers = size.match(/\d+(?:\.\d+)?/g)?.map(Number);
  if (numbers && numbers.length >= 2) {
    const longest = Math.max(...numbers.slice(0, 2));
    return Math.min(1, Math.max(0.25, longest / 24));
  }
  return 0.5;
}

/** The cheapest way in, for "From NPR ..." labels. */
export function lowestPrice(basePrice: number, variants: ProductVariant[]): number {
  return variants.length > 0 ? Math.min(...variants.map((variant) => variant.price)) : basePrice;
}
