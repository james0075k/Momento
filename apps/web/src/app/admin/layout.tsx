import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminRoot } from "@/components/admin/admin-root";

// The admin area is private: never listed by search engines (robots.txt disallows it too).
export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Momento admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminRoot>{children}</AdminRoot>;
}
