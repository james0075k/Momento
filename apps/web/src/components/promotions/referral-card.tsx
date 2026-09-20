"use client";

import { useFeature } from "@/components/features/features-provider";
import { CopyButton } from "@/components/cart/copy-button";
import { formatNpr } from "@/lib/format";
import type { TrackedOrder } from "@/lib/orders";

/** "Share your code" on the tracking page, with any reward coupons earned. Off while `referrals` is off. */
export function ReferralCard({ referral }: { referral: NonNullable<TrackedOrder["referral"]> }) {
  const enabled = useFeature("referrals");
  if (!enabled) return null;
  const message = `Use my Momento code ${referral.code} and get ${formatNpr(referral.friendDiscount)} off your first order!`;
  return (
    <section aria-labelledby="referral-title" className="bg-surface rounded-2xl p-5">
      <h2 id="referral-title" className="text-xl font-semibold">
        Share Momento, earn a reward
      </h2>
      <p className="text-muted-foreground mt-1">
        A friend who uses your code gets {formatNpr(referral.friendDiscount)} off their first order.
        When it is delivered, you get a coupon too.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <strong className="text-2xl tabular-nums">{referral.code}</strong>
        <CopyButton value={referral.code} label="referral code" />
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand focus-visible:outline-ring inline-flex min-h-11 items-center font-medium underline underline-offset-4 focus-visible:outline-2"
        >
          Send on WhatsApp
        </a>
      </div>
      {referral.rewards.length > 0 && (
        <div className="border-ink/10 mt-4 border-t pt-4">
          <h3 className="font-semibold">Your reward coupons</h3>
          <ul className="mt-2 space-y-1">
            {referral.rewards.map((reward) => (
              <li key={reward.code}>
                <strong>{reward.code}</strong> takes off {formatNpr(reward.value)} on your next
                order
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
