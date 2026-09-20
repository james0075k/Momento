"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/countdown";
import { savePendingCoupon } from "@/lib/pending-coupon";

const HEIGHT = "2.75rem";

/**
 * A slim bar fixed above the header with the festival offer and a countdown. The root layout sets
 * --banner-h while it shows, and the header and page padding read it, so nothing jumps when it loads.
 * Rendered on the server for everyone; a visitor who dismissed it (this tab) or an offer that has ended
 * hides it after load. Only transform-free, static styles: no animation.
 */
export function FestivalBanner({
  text,
  href,
  couponCode,
  endsAt,
}: {
  text: string;
  href?: string;
  couponCode?: string;
  endsAt: string;
}) {
  const dismissKey = `momento.banner.dismissed:${text}|${endsAt}`;
  const [dismissed, setDismissed] = useState(false);
  const [msLeft, setMsLeft] = useState<number | null>(null);
  // The admin area is not the shop: no offer bar there.
  const inAdmin = usePathname().startsWith("/admin");

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(dismissKey)) setDismissed(true);
    } catch {
      // Storage blocked: the banner just shows.
    }
    const tick = () => setMsLeft(new Date(endsAt).getTime() - Date.now());
    tick();
    const timer = window.setInterval(tick, 30_000);
    return () => window.clearInterval(timer);
  }, [dismissKey, endsAt]);

  const ended = msLeft !== null && msLeft <= 0;
  const visible = !dismissed && !ended && !inAdmin;

  useEffect(() => {
    document.documentElement.style.setProperty("--banner-h", visible ? HEIGHT : "0px");
  }, [visible]);

  if (!visible) return null;

  const remember = () => {
    if (couponCode) savePendingCoupon(couponCode);
  };
  const message = (
    <>
      <span className="truncate">{text}</span>
      {couponCode && (
        <span className="bg-accent text-ink shrink-0 rounded px-2 py-0.5 text-sm font-semibold">
          {couponCode}
        </span>
      )}
    </>
  );

  return (
    <div
      role="region"
      aria-label="Offer"
      className="bg-ink text-surface fixed inset-x-0 top-0 z-[45] flex h-11 items-center justify-center gap-x-3 px-12 text-sm"
    >
      {href ? (
        <Link
          href={href}
          onClick={remember}
          className="focus-visible:outline-accent flex min-w-0 items-center gap-x-3 underline-offset-4 hover:underline focus-visible:outline-2"
        >
          {message}
        </Link>
      ) : (
        <span className="flex min-w-0 items-center gap-x-3" onClick={remember}>
          {message}
        </span>
      )}
      {msLeft !== null && msLeft > 0 && (
        <span className="text-surface/80 hidden shrink-0 tabular-nums sm:inline">
          Ends in {formatCountdown(msLeft)}
        </span>
      )}
      <button
        type="button"
        aria-label="Dismiss offer"
        onClick={() => {
          try {
            window.sessionStorage.setItem(dismissKey, "1");
          } catch {
            // Dismissed for this page view only.
          }
          setDismissed(true);
        }}
        className="focus-visible:outline-accent absolute right-0 inline-flex size-11 items-center justify-center focus-visible:outline-2"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
