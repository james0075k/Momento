"use client";

import { MotionConfig, motion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { PhotoScene } from "@/components/home/scenes";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { formatNpr } from "@/lib/format";
import type { ProductCardData } from "@/lib/home";

function ProductCard({ product, priority }: { product: ProductCardData; priority: boolean }) {
  return (
    // The heart is a sibling of the link, not inside it: a button nested in a link is invalid HTML.
    <div className="relative">
      <Link
        href={`/shop/${product.slug}`}
        className="focus-visible:outline-ring group block focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <div className="bg-tint relative aspect-square overflow-hidden rounded-2xl">
          {product.image ? (
            <Image
              src={product.image}
              alt=""
              fill
              priority={priority}
              sizes="(min-width: 1024px) 22rem, (min-width: 640px) 45vw, 92vw"
              className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105"
            />
          ) : (
            <PhotoScene
              scene={product.scene}
              className="transition-transform duration-500 motion-safe:group-hover:scale-105"
            />
          )}
        </div>
        {product.category && (
          <p className="text-muted-foreground mt-3 text-sm font-medium">{product.category}</p>
        )}
        <h3 className="mt-1 text-xl font-semibold leading-snug">{product.title}</h3>
        <p className="mt-1 font-medium">
          {product.hasVariants && <span className="text-muted-foreground font-normal">From </span>}
          {formatNpr(product.fromPrice)}
        </p>
      </Link>
      <WishlistButton
        productId={product.id}
        title={product.title}
        className="absolute right-2 top-2"
      />
    </div>
  );
}

const list = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" as const } },
};

/** Cards rise in one after another. Changing a filter remounts the grid, so it plays again. */
export function ProductGrid({ products }: { products: ProductCardData[] }) {
  return (
    <MotionConfig reducedMotion="user">
      <motion.ul
        variants={list}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-x-5 gap-y-9 min-[480px]:grid-cols-2 lg:grid-cols-3"
      >
        {products.map((product, index) => (
          <motion.li key={product.id} variants={item}>
            <ProductCard product={product} priority={index < 2} />
          </motion.li>
        ))}
      </motion.ul>
    </MotionConfig>
  );
}
