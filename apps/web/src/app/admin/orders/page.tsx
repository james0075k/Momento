import type { Metadata } from "next";
import { OrdersAdmin } from "@/components/admin/orders-admin";

export const metadata: Metadata = { title: "Orders" };

/** `?q=` lets other screens (customers) link straight to someone's orders. */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q } = await searchParams;
  const initial = (Array.isArray(q) ? q[0] : q) ?? "";
  return <OrdersAdmin initialSearch={initial.slice(0, 100)} />;
}
