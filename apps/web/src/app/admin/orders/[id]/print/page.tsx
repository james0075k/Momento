import type { Metadata } from "next";
import { OrderSlip } from "@/components/admin/order-slip";

export const metadata: Metadata = { title: "Order slip" };

export default async function OrderSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OrderSlip id={id} />;
}
