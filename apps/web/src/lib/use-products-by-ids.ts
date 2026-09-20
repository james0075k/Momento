"use client";

import type { Product } from "@momento/shared";
import { useEffect, useState } from "react";
import { apiRequest } from "./api";

interface Loaded {
  key: string;
  products: Product[];
  failed: boolean;
}

/** Fetches saved products by id (public API, active products only) and returns them in the given order. */
export function useProductsByIds(ids: string[]) {
  const key = ids.join(",");
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    apiRequest<Product[]>(`/products?ids=${key}&limit=24`)
      .then((products) => {
        if (!cancelled) setLoaded({ key, products, failed: false });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key, products: [], failed: true });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  if (!key) return { products: [] as Product[], loading: false, failed: false };
  const current = loaded?.key === key ? loaded : null;
  const rank = new Map(ids.map((id, index) => [id, index]));
  const products = [...(current?.products ?? [])].sort(
    (a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0),
  );
  return { products, loading: current === null, failed: current?.failed ?? false };
}
