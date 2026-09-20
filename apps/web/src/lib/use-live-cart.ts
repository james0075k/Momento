"use client";

import type { Product } from "@momento/shared";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ApiError, apiRequest } from "./api";
import { lineKey, reconcileLine, type CartLine } from "./cart";
import { useCart } from "./use-cart";

const noop = () => () => {};

/** false while the server renders and during hydration, true afterwards. Avoids an "empty cart" flash. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
}

export type Freshness = "checking" | "fresh" | "offline";

/**
 * The cart, checked once against the live catalogue: prices and titles are refreshed and
 * products that were removed are flagged. The server still recomputes everything at checkout.
 */
export function useLiveCart() {
  const cart = useCart();
  const hydrated = useHydrated();
  const [freshness, setFreshness] = useState<Freshness>("checking");
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [changed, setChanged] = useState<string[]>([]);
  const checked = useRef(false);

  useEffect(() => {
    if (!hydrated || checked.current) return;
    checked.current = true;
    const lines = cart.lines;
    if (lines.length === 0) {
      setFreshness("fresh");
      return;
    }

    const ids = [...new Set(lines.map((line) => line.productId))];
    void Promise.all(
      ids.map(async (id): Promise<[string, Product | null | "error"]> => {
        try {
          return [id, await apiRequest<Product>(`/products/${id}`)];
        } catch (error) {
          return [id, error instanceof ApiError && error.status === 404 ? null : "error"];
        }
      }),
    ).then((results) => {
      const products = new Map(results);
      if ([...products.values()].includes("error")) {
        setFreshness("offline");
        return;
      }
      const gone: string[] = [];
      const moved: string[] = [];
      const next: CartLine[] = lines.map((line) => {
        const result = reconcileLine(line, products.get(line.productId) as Product | null);
        if (result.state === "unavailable") gone.push(lineKey(line));
        else if (result.changed) moved.push(lineKey(line));
        return result.line;
      });
      cart.replaceAll(next);
      setUnavailable(gone);
      setChanged(moved);
      setFreshness("fresh");
    });
  }, [hydrated, cart]);

  const available = cart.lines.filter((line) => !unavailable.includes(lineKey(line)));
  return {
    ...cart,
    hydrated,
    freshness,
    unavailable,
    changed,
    availableLines: available,
    availableSubtotal: available.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  };
}
