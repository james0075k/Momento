import type { Order } from "@momento/shared";
import { formatNpr } from "./format";

interface MessageOrder {
  code: string;
  customerName?: string;
  items: Array<Pick<Order["items"][number], "title" | "variantLabel" | "quantity" | "lineTotal">>;
  total: number;
  photoCount?: number;
}

/** The text a customer sends to the shop. Kept short so it fits a wa.me link on every phone. */
export function buildOrderMessage(order: MessageOrder): string {
  const lines = order.items.map((item) => {
    const variant = item.variantLabel ? ` (${item.variantLabel})` : "";
    return `- ${item.quantity} x ${item.title}${variant}: ${formatNpr(item.lineTotal)}`;
  });
  return [
    `Hi Momento! I placed order ${order.code}.`,
    ...(order.customerName ? [`Name: ${order.customerName}`] : []),
    "",
    ...lines,
    "",
    `Total: ${formatNpr(order.total)}`,
    ...(order.photoCount ? [`Photos uploaded: ${order.photoCount}`] : []),
    "",
    "Please confirm and share the payment details.",
  ].join("\n");
}
