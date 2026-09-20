import type { Product } from "@momento/shared";
import type { ProductCardData } from "./home";

export const toProductCard = (
  product: Product,
  categories: Map<string, string>,
): ProductCardData => ({
  id: product.id,
  slug: product.slug,
  title: product.title,
  shortDescription: product.shortDescription,
  image: product.images[0],
  category: categories.get(product.categoryId),
  scene: "himal",
  fromPrice:
    product.variants.length > 0
      ? Math.min(...product.variants.map((variant) => variant.price))
      : product.basePrice,
  hasVariants: product.variants.length > 0,
});
