"use client";

import { useFeature } from "@/components/features/features-provider";
import { formatNpr } from "@/lib/format";
import { CodeField } from "./code-field";

export interface AppliedReferral {
  code: string;
  discount: number;
}
export interface AppliedGiftCard {
  code: string;
  balance: number;
}

/** The referral box at checkout. Renders nothing while the `referrals` flag is off. */
export function ReferralField({
  applied,
  onApply,
  onRemove,
}: {
  applied: AppliedReferral | null;
  onApply: (value: AppliedReferral) => void;
  onRemove: () => void;
}) {
  const enabled = useFeature("referrals");
  if (!enabled) return null;
  return (
    <CodeField<AppliedReferral>
      id="referral"
      title="Referral code"
      hint="Got a code from a friend? It takes money off your first order."
      placeholder="MOM-XXXXXX"
      path="/referrals/validate"
      applied={applied}
      describe={(value) => `takes off ${formatNpr(value.discount)}`}
      onApply={onApply}
      onRemove={onRemove}
    />
  );
}

/** The gift card box at checkout. Renders nothing while the `giftCards` flag is off. */
export function GiftCardField({
  applied,
  onApply,
  onRemove,
}: {
  applied: AppliedGiftCard | null;
  onApply: (value: AppliedGiftCard) => void;
  onRemove: () => void;
}) {
  const enabled = useFeature("giftCards");
  if (!enabled) return null;
  return (
    <CodeField<AppliedGiftCard>
      id="gift-card"
      title="Gift card"
      hint="Enter your gift card code. It pays for your order, delivery included, up to its balance."
      placeholder="GC-XXXX-XXXX"
      path="/gift-cards/balance"
      applied={applied}
      describe={(value) => `has ${formatNpr(value.balance)} to use`}
      onApply={onApply}
      onRemove={onRemove}
    />
  );
}
