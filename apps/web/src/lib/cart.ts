import type { Product } from "@momento/shared";

/** What the cart remembers. Prices here are only a preview: the server recomputes them. */
export interface CartLine {
  productId: string;
  variantId?: string;
  quantity: number;
  title: string;
  slug: string;
  image?: string;
  variantLabel?: string;
  unitPrice: number;
}

export const CART_STORAGE_KEY = "momento.cart.v1";
export const MAX_LINE_QUANTITY = 50;
export const MAX_CART_LINES = 30;

export const lineKey = (line: Pick<CartLine, "productId" | "variantId">): string =>
  `${line.productId}:${line.variantId ?? ""}`;

const clampQuantity = (quantity: number): number =>
  Math.min(MAX_LINE_QUANTITY, Math.max(1, Math.floor(quantity)));

export function addLine(lines: CartLine[], line: CartLine): CartLine[] {
  const key = lineKey(line);
  const existing = lines.find((candidate) => lineKey(candidate) === key);
  if (existing) {
    return lines.map((candidate) =>
      candidate === existing
        ? { ...line, quantity: clampQuantity(existing.quantity + line.quantity) }
        : candidate,
    );
  }
  if (lines.length >= MAX_CART_LINES) return lines;
  return [...lines, { ...line, quantity: clampQuantity(line.quantity) }];
}

export function removeLine(lines: CartLine[], key: string): CartLine[] {
  return lines.filter((line) => lineKey(line) !== key);
}

export function setQuantity(lines: CartLine[], key: string, quantity: number): CartLine[] {
  if (quantity < 1) return removeLine(lines, key);
  return lines.map((line) =>
    lineKey(line) === key ? { ...line, quantity: clampQuantity(quantity) } : line,
  );
}

export const cartSubtotal = (lines: CartLine[]): number =>
  lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

export const cartCount = (lines: CartLine[]): number =>
  lines.reduce((sum, line) => sum + line.quantity, 0);

const isId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f\d]{24}$/i.test(value);

/** Reads whatever was in localStorage and keeps only well-formed lines. Never throws. */
export function parseCart(raw: string | null): CartLine[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const lines: CartLine[] = [];
    for (const item of data as Array<Record<string, unknown> | null>) {
      if (
        !item ||
        !isId(item.productId) ||
        (item.variantId !== undefined && !isId(item.variantId)) ||
        typeof item.quantity !== "number" ||
        typeof item.title !== "string" ||
        typeof item.slug !== "string" ||
        typeof item.unitPrice !== "number" ||
        !Number.isFinite(item.unitPrice)
      ) {
        continue;
      }
      lines.push({
        productId: item.productId,
        variantId: item.variantId as string | undefined,
        quantity: clampQuantity(item.quantity),
        title: item.title,
        slug: item.slug,
        image: typeof item.image === "string" ? item.image : undefined,
        variantLabel: typeof item.variantLabel === "string" ? item.variantLabel : undefined,
        unitPrice: Math.max(0, Math.round(item.unitPrice)),
      });
    }
    return lines.slice(0, MAX_CART_LINES);
  } catch {
    return [];
  }
}

export function variantLabel(variant: { size: string; cover?: string; pages?: number }): string {
  return [variant.size, variant.cover, variant.pages ? `${variant.pages} pages` : undefined]
    .filter(Boolean)
    .join(", ");
}

export type LineStatus =
  { state: "ok"; line: CartLine; changed: boolean } | { state: "unavailable"; line: CartLine };

/** Compares a cart line with the live product: refreshes its price and title, or flags it gone. */
export function reconcileLine(line: CartLine, product: Product | null): LineStatus {
  if (!product || !product.isActive) return { state: "unavailable", line };
  let unitPrice = product.basePrice;
  let label: string | undefined;
  if (product.variants.length > 0) {
    const variant = product.variants.find((candidate) => candidate.id === line.variantId);
    if (!variant) return { state: "unavailable", line };
    unitPrice = variant.price;
    label = variantLabel(variant);
  } else if (line.variantId) {
    return { state: "unavailable", line };
  }
  const next: CartLine = {
    ...line,
    title: product.title,
    slug: product.slug,
    image: product.images[0],
    variantLabel: label,
    unitPrice,
  };
  const changed =
    next.unitPrice !== line.unitPrice ||
    next.title !== line.title ||
    next.variantLabel !== line.variantLabel;
  return { state: "ok", line: next, changed };
}
