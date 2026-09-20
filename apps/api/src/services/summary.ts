import { OrderModel } from "../models/Order";
import { ReviewModel } from "../models/Review";
import { customerReplyLink, reviewRequestLink } from "./whatsappLinks";

/** Nepal Standard Time is UTC+05:45. The shop thinks in Nepal days, not UTC days. */
const NEPAL_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const PENDING_AFTER_MS = DAY_MS;
const REVIEW_WINDOW_MS = 3 * DAY_MS;
const LIST_LIMIT = 20;
const PAID_STATUSES = ["paid", "printing", "shipped", "delivered"];

/** The Nepal calendar day (YYYY-MM-DD) that `now` falls in. */
export function nepalDay(now = new Date()): string {
  return new Date(now.getTime() + NEPAL_OFFSET_MS).toISOString().slice(0, 10);
}

/** The instants a Nepal day starts and ends, as UTC dates. `end` is exclusive. */
export function nepalDayRange(day: string): { start: Date; end: Date } {
  const [year, month, date] = day.split("-").map(Number) as [number, number, number];
  const start = new Date(Date.UTC(year, month - 1, date) - NEPAL_OFFSET_MS);
  return { start, end: new Date(start.getTime() + DAY_MS) };
}

interface LeanOrder {
  _id: unknown;
  code: string;
  status: string;
  total: number;
  createdAt: Date;
  customer?: { name?: string | null; phone?: string | null; area?: string | null } | null;
  items?: Array<{ title: string; variantLabel?: string | null; quantity: number }>;
}

export interface DailySummary {
  day: string;
  generatedAt: string;
  newOrders: number;
  byStatus: Record<string, number>;
  /** Orders whose payment was confirmed on this day. */
  paid: { count: number; amount: number };
  topProducts: Array<{ title: string; quantity: number }>;
  /** Waiting for payment for more than 24 hours. */
  pendingPayments: Array<{
    code: string;
    name: string;
    total: number;
    hoursOld: number;
    replyLink?: string;
  }>;
  reviewsAwaitingApproval: number;
  /** Delivered in the last 3 days and not asked for a review yet. */
  reviewRequests: Array<{ code: string; name: string; link?: string }>;
}

export interface BuiltSummary {
  summary: DailySummary;
  /** Orders the review requests are about, so they can be marked once the email is sent. */
  reviewRequestOrderIds: string[];
}

export async function buildDailySummary(
  options: { day?: string; now?: Date } = {},
): Promise<BuiltSummary> {
  const now = options.now ?? new Date();
  const day = options.day ?? nepalDay(now);
  const { start, end } = nepalDayRange(day);
  const fields = "code status total createdAt items customer.name customer.phone customer.area";

  const [created, paidToday, pending, toAsk, reviewsPending] = await Promise.all([
    OrderModel.find({ createdAt: { $gte: start, $lt: end } })
      .select(fields)
      .lean<LeanOrder[]>(),
    OrderModel.find({
      status: { $in: PAID_STATUSES },
      statusHistory: { $elemMatch: { status: "paid", at: { $gte: start, $lt: end } } },
    })
      .select("total")
      .lean<Array<{ total: number }>>(),
    OrderModel.find({
      status: "pending_payment",
      createdAt: { $lt: new Date(now.getTime() - PENDING_AFTER_MS) },
    })
      .sort({ createdAt: 1 })
      .limit(LIST_LIMIT)
      .select(fields)
      .lean<LeanOrder[]>(),
    OrderModel.find({
      status: "delivered",
      reviewRequestSentAt: { $exists: false },
      statusHistory: {
        $elemMatch: {
          status: "delivered",
          at: { $gte: new Date(now.getTime() - REVIEW_WINDOW_MS) },
        },
      },
    })
      .sort({ createdAt: 1 })
      .limit(LIST_LIMIT)
      .select(fields)
      .lean<LeanOrder[]>(),
    ReviewModel.countDocuments({ status: "pending" }),
  ]);

  const byStatus: Record<string, number> = {};
  const quantities = new Map<string, number>();
  for (const order of created) {
    byStatus[order.status] = (byStatus[order.status] ?? 0) + 1;
    if (order.status === "cancelled") continue;
    for (const item of order.items ?? []) {
      quantities.set(item.title, (quantities.get(item.title) ?? 0) + item.quantity);
    }
  }

  const summary: DailySummary = {
    day,
    generatedAt: now.toISOString(),
    newOrders: created.length,
    byStatus,
    paid: {
      count: paidToday.length,
      amount: paidToday.reduce((sum, order) => sum + order.total, 0),
    },
    topProducts: [...quantities]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([title, quantity]) => ({ title, quantity })),
    pendingPayments: pending.map((order) => ({
      code: order.code,
      name: order.customer?.name ?? "",
      total: order.total,
      hoursOld: Math.floor((now.getTime() - new Date(order.createdAt).getTime()) / 3_600_000),
      replyLink: customerReplyLink(order),
    })),
    reviewsAwaitingApproval: reviewsPending,
    reviewRequests: toAsk.map((order) => ({
      code: order.code,
      name: order.customer?.name ?? "",
      link: reviewRequestLink(order),
    })),
  };
  return { summary, reviewRequestOrderIds: toAsk.map((order) => String(order._id)) };
}
