"use client";

import { ChevronRight, Menu, MessageCircle, ShoppingBag, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { WishlistLink } from "@/components/wishlist/wishlist-link";
import { useCart } from "@/lib/use-cart";
import { cn } from "@/lib/utils";
import { whatsappLink } from "@/lib/whatsapp";

const LINKS = [
  { label: "Shop", href: "/shop" },
  { label: "Services", href: "/services" },
  { label: "Occasions", href: "/occasions" },
  { label: "Reviews", href: "/#reviews" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Blog", href: "/blog" },
  { label: "Track order", href: "/track" },
];

/** Bag icon with the number of items in the cart. The count only shows after the page loads. */
function CartLink({ className }: { className?: string }) {
  const { count } = useCart();
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Cart, ${count} ${count === 1 ? "item" : "items"}` : "Cart"}
      className={cn(
        "relative inline-flex size-11 items-center justify-center focus-visible:outline-2",
        className,
      )}
    >
      <ShoppingBag aria-hidden className="size-6" />
      {count > 0 && (
        <span
          aria-hidden
          className="bg-brand text-surface absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold leading-5"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "font-heading flex min-h-11 items-center gap-2 text-2xl font-semibold focus-visible:outline-2",
        className,
      )}
    >
      <span aria-hidden className="bg-brand relative block size-5 -rotate-6">
        <span className="bg-paper absolute inset-x-[3px] top-[3px] h-2.5" />
      </span>
      Momento
    </Link>
  );
}

/**
 * Fixed glass bar over the hero. It frosts dark at the top and turns to light glass once the
 * page scrolls, cross-fading two layers (opacity only). Phones get a full-screen menu.
 */
export function SiteHeader({
  whatsappNumber,
  solid = false,
}: {
  whatsappNumber: string;
  /** Pages without a dark hero start on the light glass instead of the dark one. */
  solid?: boolean;
}) {
  const [scrolledDown, setScrolled] = useState(false);
  const scrolled = solid || scrolledDown;
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      menuButton.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const focus = scrolled ? "focus-visible:outline-ring" : "focus-visible:outline-surface";

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-[var(--banner-h,0px)] z-40",
          scrolled ? "text-ink" : "text-surface",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "border-surface/15 bg-ink/25 absolute inset-0 border-b backdrop-blur-2xl backdrop-saturate-150 transition-opacity duration-300",
            scrolled && "opacity-0",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "border-ink/10 bg-paper/55 absolute inset-0 border-b opacity-0 backdrop-blur-2xl backdrop-saturate-150 transition-opacity duration-300",
            scrolled && "opacity-100",
          )}
        />
        <div className="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 md:px-8">
          <Logo className={focus} />
          <nav aria-label="Main" className="hidden flex-1 items-center gap-1 md:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex min-h-11 items-center px-3 font-medium hover:underline focus-visible:outline-2",
                  focus,
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <WishlistLink className={focus} />
            <CartLink className={focus} />
            <a
              href={whatsappLink(whatsappNumber)}
              className={cn(buttonVariants({ size: "sm" }), "ml-2 hidden md:inline-flex")}
            >
              <MessageCircle aria-hidden />
              Order on WhatsApp
            </a>
            <button
              ref={menuButton}
              type="button"
              aria-label="Open menu"
              aria-expanded={open}
              onClick={() => setOpen(true)}
              className={cn(
                "inline-flex size-11 items-center justify-center focus-visible:outline-2 md:hidden",
                focus,
              )}
            >
              <Menu aria-hidden className="size-7" />
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="menu-in bg-paper text-ink fixed inset-0 z-50 flex flex-col px-4 pb-6"
        >
          <div className="flex h-16 items-center justify-between">
            <Logo className="focus-visible:outline-ring" />
            <button
              ref={closeButton}
              type="button"
              aria-label="Close menu"
              onClick={() => {
                setOpen(false);
                menuButton.current?.focus();
              }}
              className="focus-visible:outline-ring inline-flex size-11 items-center justify-center focus-visible:outline-2"
            >
              <X aria-hidden className="size-7" />
            </button>
          </div>
          <nav aria-label="Menu" className="mt-2 flex-1 overflow-y-auto">
            <ul>
              {LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="focus-visible:outline-ring flex min-h-14 items-center justify-between text-lg font-medium focus-visible:outline-2"
                  >
                    {link.label}
                    <ChevronRight aria-hidden className="text-muted-foreground size-5" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-ink/15 border-t pt-5">
            <a
              href={whatsappLink(whatsappNumber)}
              className={cn(buttonVariants({ size: "lg" }), "h-12 w-full")}
            >
              <MessageCircle aria-hidden />
              Order on WhatsApp
            </a>
          </div>
        </div>
      )}
    </>
  );
}
