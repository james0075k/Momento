"use client";

import { createContext, useContext, type ReactNode } from "react";
import { resolveFeatures, type FeatureFlags, type FeatureKey } from "@momento/shared";

const FeaturesContext = createContext<FeatureFlags>(resolveFeatures());

/**
 * Hands the Phase 8 flags (read once, on the server, from Settings) to client components.
 * Anything outside the provider, or any flag that is missing, reads as off.
 */
export function FeaturesProvider({
  features,
  children,
}: {
  features: FeatureFlags;
  children: ReactNode;
}) {
  return <FeaturesContext.Provider value={features}>{children}</FeaturesContext.Provider>;
}

export function useFeature(key: FeatureKey): boolean {
  return useContext(FeaturesContext)[key] === true;
}
