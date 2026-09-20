"use client";

import type { FeatureKey } from "@momento/shared";
import Link from "next/link";
import type { ReactNode } from "react";
import { useFeature } from "@/components/features/features-provider";

/** A footer or menu link that exists only while its feature flag is on. */
export function FeatureLink({
  feature,
  href,
  className,
  children,
}: {
  feature: FeatureKey;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  if (!useFeature(feature)) return null;
  return (
    <li>
      <Link href={href} className={className}>
        {children}
      </Link>
    </li>
  );
}
