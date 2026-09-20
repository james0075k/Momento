import type { OrderStatus } from "@momento/shared";
import { env } from "../config/env";

/** The parts of an order these links need. Deliberately no address: links get forwarded. */
export interface LinkOrder {
  code: string;
  status: string;
  total: number;
  customer?: { name?: string | null; phone?: string | null; area?: string | null } | null;
  items?: Array<{ title: string; variantLabel?: string | null; quantity: number }>;
}

/** wa.me wants digits with the country code. A 10-digit Nepali number gets 977 in front. */
export function phoneForWhatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `977${digits}` : digits;
}

const firstName = (name?: string | null): string => name?.trim().split(/\s+/)[0] || "there";

const STATUS_TEXT: Record<OrderStatus, (code: string) => string> = {
  pending_payment: (code) =>
    `We received your order ${code}. Please send your payment by eSewa, Khalti or bank transfer and we will start right away.`,
  paid: (code) => `We have your payment for order ${code}. We are getting it ready.`,
  printing: (code) => `Your order ${code} is being printed now.`,
  shipped: (code) => `Your order ${code} is on its way to you.`,
  delivered: (code) => `Your order ${code} was delivered. We hope you love it!`,
  cancelled: (code) =>
    `Your order ${code} was cancelled. Message us any time if you would like to order again.`,
};

/** Opens a chat with the customer, with a message that fits the order's status. */
export function customerReplyLink(order: LinkOrder): string | undefined {
  const phone = order.customer?.phone;
  if (!phone) return undefined;
  const text =
    STATUS_TEXT[order.status as OrderStatus]?.(order.code) ?? `About your order ${order.code}.`;
  return `https://wa.me/${phoneForWhatsapp(phone)}?text=${encodeURIComponent(
    `Hi ${firstName(order.customer?.name)}, this is Momento. ${text}`,
  )}`;
}

const AREA_TEXT: Record<string, string> = {
  inside_valley: "inside Kathmandu Valley",
  outside_valley: "outside the valley",
};

/**
 * Opens WhatsApp's contact picker with the order written out, to forward to a printer or rider.
 * It holds no phone number and no address: they get those from the shop, not from a forwarded message.
 */
export function teamShareLink(order: LinkOrder): string {
  const items = (order.items ?? [])
    .map(
      (item) =>
        `${item.quantity} x ${item.title}${item.variantLabel ? ` (${item.variantLabel})` : ""}`,
    )
    .join("; ");
  const area = order.customer?.area ? AREA_TEXT[order.customer.area] : undefined;
  const text = [
    `Order ${order.code}`,
    items,
    area ? `Deliver ${area}` : undefined,
    `Total NPR ${order.total}`,
  ]
    .filter(Boolean)
    .join(". ");
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** A polite review request to send to a customer whose order was delivered. */
export function reviewRequestLink(order: LinkOrder): string | undefined {
  const phone = order.customer?.phone;
  if (!phone) return undefined;
  const where = env.SITE_URL ? ` You can leave it on any product page: ${env.SITE_URL}/shop` : "";
  const text = `Hi ${firstName(order.customer?.name)}, thank you for ordering from Momento! If you have a minute, we would love a short review of your order ${order.code}, with a photo if you like.${where}`;
  return `https://wa.me/${phoneForWhatsapp(phone)}?text=${encodeURIComponent(text)}`;
}
