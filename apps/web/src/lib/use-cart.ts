"use client";

import { useCallback, useSyncExternalStore } from "react";
import {
  addLine,
  CART_STORAGE_KEY,
  cartCount,
  cartSubtotal,
  parseCart,
  removeLine,
  setQuantity,
  type CartLine,
} from "./cart";

const EMPTY: CartLine[] = [];
let cached: { raw: string | null; lines: CartLine[] } = { raw: null, lines: EMPTY };
const listeners = new Set<() => void>();

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return cached.raw;
  }
}

/** Same reference until the stored text changes, which useSyncExternalStore needs. */
function getSnapshot(): CartLine[] {
  const raw = readRaw();
  if (raw !== cached.raw) cached = { raw, lines: raw ? parseCart(raw) : EMPTY };
  return cached.lines;
}

const getServerSnapshot = (): CartLine[] => EMPTY;

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // The "storage" event covers other tabs; our own writes notify listeners directly.
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function write(lines: CartLine[]): void {
  const raw = lines.length === 0 ? null : JSON.stringify(lines);
  try {
    if (raw === null) window.localStorage.removeItem(CART_STORAGE_KEY);
    else window.localStorage.setItem(CART_STORAGE_KEY, raw);
  } catch {
    // Storage can be blocked (private mode). Keep working for this page view only.
    cached = { raw, lines };
  }
  listeners.forEach((listener) => listener());
}

/** The cart, persisted in localStorage and kept in sync across components and tabs. */
export function useCart() {
  const lines = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    lines,
    count: cartCount(lines),
    subtotal: cartSubtotal(lines),
    add: useCallback((line: CartLine) => write(addLine(getSnapshot(), line)), []),
    setQuantity: useCallback(
      (key: string, quantity: number) => write(setQuantity(getSnapshot(), key, quantity)),
      [],
    ),
    remove: useCallback((key: string) => write(removeLine(getSnapshot(), key)), []),
    replaceAll: useCallback((next: CartLine[]) => write(next), []),
    clear: useCallback(() => write([]), []),
  };
}
