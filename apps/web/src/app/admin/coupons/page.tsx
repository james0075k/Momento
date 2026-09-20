import type { Metadata } from "next";
import { CouponsAdmin } from "@/components/admin/coupons-admin";

export const metadata: Metadata = { title: "Coupons" };

export default function CouponsPage() {
  return <CouponsAdmin />;
}
