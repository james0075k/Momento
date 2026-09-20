"use client";

import { useCallback, useSyncExternalStore } from "react";
import { parseIdList } from "./id-list";

const EMPTY: string[] = [];

/**
 * A localStorage-backed list of ids that every component and tab sees the same way. Same approach as
 * the cart (`use-cart.ts`): useSyncExternalStore, storage events for other tabs, and a fallback for
 * private mode where storage is blocked.
 */
export function createIdListStore(storageKey: string, max: number) {
  let cached: { raw: string | null; list: string[] } = { raw: null, list: EMPTY };
  const listeners = new Set<() => void>();

  const readRaw = (): string | null => {
    try {
      return window.localStorage.getItem(storageKey);
    } catch {
      return cached.raw;
    }
  };

  function getSnapshot(): string[] {
    const raw = readRaw();
    if (raw !== cached.raw) cached = { raw, list: raw ? parseIdList(raw, max) : EMPTY };
    return cached.list;
  }

  const getServerSnapshot = (): string[] => EMPTY;

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    window.addEventListener("storage", listener);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", listener);
    };
  }

  function write(list: string[]): void {
    const raw = list.length === 0 ? null : JSON.stringify(list);
    try {
      if (raw === null) window.localStorage.removeItem(storageKey);
      else window.localStorage.setItem(storageKey, raw);
    } catch {
      cached = { raw, list };
    }
    listeners.forEach((listener) => listener());
  }

  return function useIdList() {
    const list = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    return {
      list,
      /** Applies a pure update (toggleId, pushRecent) to the current list. */
      update: useCallback(
        (change: (current: string[]) => string[]) => write(change(getSnapshot())),
        [],
      ),
    };
  };
}
