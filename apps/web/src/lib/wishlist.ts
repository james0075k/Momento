"use client";

import { createIdListStore } from "./use-id-list";
import { MAX_RECENT, MAX_WISHLIST, RECENT_STORAGE_KEY, WISHLIST_STORAGE_KEY } from "./id-list";

export const useWishlist = createIdListStore(WISHLIST_STORAGE_KEY, MAX_WISHLIST);
export const useRecentlyViewed = createIdListStore(RECENT_STORAGE_KEY, MAX_RECENT);
