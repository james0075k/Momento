import type { Settings } from "@momento/shared";
import Link from "next/link";
import { FeatureLink } from "./feature-link";

const link =
  "inline-flex min-h-11 items-center hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

const SOCIAL: Array<[keyof Settings["socialLinks"], string]> = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
];

export function SiteFooter({ socialLinks }: { socialLinks: Settings["socialLinks"] }) {
  const social = SOCIAL.flatMap(([key, label]) => {
    const href = socialLinks[key];
    return href ? [{ href, label }] : [];
  });

  return (
    <footer className="bg-ink text-surface pb-28 pt-14 md:pb-14">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8">
        <div>
          <p className="font-heading text-3xl font-semibold">Momento</p>
          <p className="text-surface/80 mt-3 max-w-xs">
            Photo books, frames and prints, made in Nepal. Orders and support on WhatsApp.
          </p>
        </div>
        <nav aria-label="Footer">
          <p className="font-semibold">Shop</p>
          <ul className="text-surface/85 mt-2">
            <li>
              <Link href="/shop" className={link}>
                All products
              </Link>
            </li>
            <li>
              <Link href="/services" className={link}>
                Services
              </Link>
            </li>
            <li>
              <Link href="/occasions" className={link}>
                By occasion
              </Link>
            </li>
            <li>
              <Link href="/#reviews" className={link}>
                Customer reviews
              </Link>
            </li>
            <FeatureLink feature="giftCards" href="/gift-cards" className={link}>
              Gift cards
            </FeatureLink>
            <FeatureLink feature="wishlist" href="/wishlist" className={link}>
              Wishlist
            </FeatureLink>
            <li>
              <Link href="/track" className={link}>
                Track your order
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label="Learn">
          <p className="font-semibold">Learn</p>
          <ul className="text-surface/85 mt-2">
            <li>
              <Link href="/how-it-works" className={link}>
                How it works
              </Link>
            </li>
            <li>
              <Link href="/faq" className={link}>
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/blog" className={link}>
                Blog
              </Link>
            </li>
          </ul>
        </nav>
        {social.length > 0 && (
          <div>
            <p className="font-semibold">Follow us</p>
            <ul className="text-surface/85 mt-2">
              {social.map(({ href, label }) => (
                <li key={label}>
                  <a href={href} rel="noopener noreferrer" className={link}>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="text-surface/70 mx-auto mt-12 max-w-6xl px-4 text-sm md:px-8">
        © {new Date().getFullYear()} Momento. All prices in NPR.
      </p>
    </footer>
  );
}
