import type { ReactNode } from "react";
import { getSettings } from "@/lib/catalog";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { SmoothScroll } from "./smooth-scroll";
import { StickyWhatsApp } from "./sticky-whatsapp";

interface PageShellProps {
  children: ReactNode;
  /** Pages with their own sticky bottom bar (product, checkout) turn the WhatsApp bar off. */
  hideStickyBar?: boolean;
}

/** Header, footer and WhatsApp bar for every page except the homepage. */
export async function PageShell({ children, hideStickyBar = false }: PageShellProps) {
  const settings = await getSettings();
  return (
    <>
      <SmoothScroll />
      <SiteHeader whatsappNumber={settings.shopWhatsappNumber} solid />
      <main className="pt-[calc(4rem+var(--banner-h,0px))]">{children}</main>
      <SiteFooter socialLinks={settings.socialLinks} />
      {!hideStickyBar && <StickyWhatsApp whatsappNumber={settings.shopWhatsappNumber} />}
    </>
  );
}
