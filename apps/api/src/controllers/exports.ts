import type { OrderExportQuery } from "@momento/shared";
import type { Response } from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { OrderModel } from "../models/Order";
import { CSV_BOM, csvRow } from "../services/csv";
import { nepalDayRange } from "../services/summary";

/** A small shop history fits easily; the cap only protects the server from an unbounded download. */
const MAX_ROWS = 100_000;

interface ExportOrder {
  code: string;
  createdAt: Date;
  status: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  referralDiscount?: number;
  giftCardApplied?: number;
  couponCode?: string;
  paymentMethod: string;
  customer?: { name?: string; phone?: string; area?: string } | null;
  items?: Array<{ title: string; variantLabel?: string | null; quantity: number }>;
}

function startCsv(res: Response, name: string, truncated: boolean) {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  // Personal data: never cached by the browser or a proxy.
  res.setHeader("Cache-Control", "no-store");
  if (truncated) res.setHeader("X-Export-Truncated", "true");
  res.write(CSV_BOM);
}

const today = () => new Date().toISOString().slice(0, 10);
const lastTen = (phone: string) => phone.replace(/\D/g, "").slice(-10);

const itemsText = (items: ExportOrder["items"]) =>
  (items ?? [])
    .map((i) => `${i.quantity} x ${i.title}${i.variantLabel ? ` (${i.variantLabel})` : ""}`)
    .join("; ");

/** Once the body has started there is no way to send a JSON error, so drop the connection instead. */
async function stream(res: Response, write: () => Promise<void>) {
  try {
    await write();
    res.end();
  } catch (err) {
    res.destroy(err instanceof Error ? err : undefined);
  }
}

export const exportController = {
  /** Admin only. No addresses: the file is for accounting and follow-ups, not for delivery. */
  orders: asyncHandler(async (req, res) => {
    const { from, to, status } = req.query as unknown as OrderExportQuery;
    const filter: Record<string, unknown> = {};
    if (status) filter["status"] = status;
    if (from || to) {
      filter["createdAt"] = {
        ...(from ? { $gte: nepalDayRange(from).start } : {}),
        ...(to ? { $lt: nepalDayRange(to).end } : {}),
      };
    }
    const total = await OrderModel.countDocuments(filter);
    startCsv(res, `momento-orders-${today()}.csv`, total > MAX_ROWS);
    await stream(res, async () => {
      res.write(
        csvRow([
          "Order code",
          "Created (UTC)",
          "Status",
          "Customer",
          "Phone",
          "Area",
          "Items",
          "Items total (NPR)",
          "Delivery (NPR)",
          "Coupon discount (NPR)",
          "Coupon",
          "Referral discount (NPR)",
          "Gift card (NPR)",
          "Total (NPR)",
          "Payment method",
        ]),
      );
      const cursor = OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .limit(MAX_ROWS)
        .lean<ExportOrder[]>()
        .cursor();
      for await (const order of cursor) {
        res.write(
          csvRow(
            [
              order.code,
              order.createdAt,
              order.status,
              order.customer?.name,
              order.customer?.phone,
              order.customer?.area,
              itemsText(order.items),
              order.subtotal,
              order.deliveryFee,
              order.discount,
              order.couponCode,
              order.referralDiscount ?? 0,
              order.giftCardApplied ?? 0,
              order.total,
              order.paymentMethod,
            ],
            [4],
          ),
        );
      }
    });
  }),

  /** Admin only. One row per phone number (last 10 digits); the newest name wins. */
  customers: asyncHandler(async (_req, res) => {
    startCsv(res, `momento-customers-${today()}.csv`, false);
    await stream(res, async () => {
      const customers = new Map<
        string,
        { name: string; phone: string; orders: number; spent: number; first: Date; last: Date }
      >();
      const cursor = OrderModel.find()
        .sort({ createdAt: 1 })
        .limit(MAX_ROWS)
        .select("createdAt status total customer.name customer.phone")
        .lean<ExportOrder[]>()
        .cursor();
      for await (const order of cursor) {
        const phone = order.customer?.phone ?? "";
        const key = lastTen(phone);
        if (!key) continue;
        const entry = customers.get(key) ?? {
          name: "",
          phone,
          orders: 0,
          spent: 0,
          first: order.createdAt,
          last: order.createdAt,
        };
        entry.name = order.customer?.name ?? entry.name;
        entry.phone = phone;
        entry.orders += 1;
        if (order.status !== "cancelled") entry.spent += order.total;
        entry.last = order.createdAt;
        customers.set(key, entry);
      }
      res.write(
        csvRow([
          "Customer",
          "Phone",
          "Orders",
          "Spent, excluding cancelled (NPR)",
          "First order (UTC)",
          "Last order (UTC)",
        ]),
      );
      for (const c of customers.values()) {
        res.write(csvRow([c.name, c.phone, c.orders, c.spent, c.first, c.last], [1]));
      }
    });
  }),
};
