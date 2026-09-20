import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminRoot } from "@/components/admin/admin-root";

// The admin area is private: never listed by search engines (robots.txt disallows it too).
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Momento admin" },
  robots: { index: false, follow: false },
  // What a shared admin link looks like in WhatsApp or Messenger: the logo card, named "Momento admin".
  openGraph: {
    title: "Momento admin",
    description: "Sign in to manage Momento orders, products and reviews.",
    siteName: "Momento",
    type: "website",
  },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminRoot>{children}</AdminRoot>;
}
