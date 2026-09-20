import { OrderModel } from "../models/Order";
import { ReviewModel } from "../models/Review";
import { nepalDay, nepalDayRange } from "./summary";

const PAID_STATUSES = ["paid", "printing", "shipped", "delivered"];
const ALL_STATUSES = ["pending_payment", "paid", "printing", "shipped", "delivered", "cancelled"];

export interface PeriodStats {
  /** Orders placed in the period, cancelled ones left out. */
  orders: number;
  /** Payments confirmed in the period (orders still cancelled do not count). */
  paidOrders: number;
  revenue: number;
}

export interface Dashboard {
  generatedAt: string;
  today: PeriodStats & { day: string };
  month: PeriodStats & { month: string };
  /** Waiting for payment right now, however old. */
  pendingPayments: { count: number; amount: number };
  /** Orders placed this month, by status (every status is present, with 0 when none). */
  ordersByStatus: Record<string, number>;
  topProducts: Array<{ title: string; quantity: number }>;
  reviewsAwaitingApproval: {
    count: number;
    latest: Array<{ id: string; name: string; rating: number; comment: string; createdAt: string }>;
  };
}

interface Range {
  start: Date;
  end: Date;
}

/** First instant of the Nepal month `day` falls in, and of the next month. */
export function nepalMonthRange(day: string): Range & { month: string } {
  const [year, month] = day.split("-").map(Number) as [number, number];
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const next =
    month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return {
    start: nepalDayRange(first).start,
    end: nepalDayRange(next).start,
    month: first.slice(0, 7),
  };
}

async function periodStats({ start, end }: Range): Promise<PeriodStats> {
  const [created, paid] = await Promise.all([
    OrderModel.aggregate<{ count: number }>([
      { $match: { createdAt: { $gte: start, $lt: end }, status: { $ne: "cancelled" } } },
      { $group: { _id: null, count: { $sum: 1 } } },
    ]),
    OrderModel.aggregate<{ count: number; amount: number }>([
      {
        $match: {
          status: { $in: PAID_STATUSES },
          statusHistory: { $elemMatch: { status: "paid", at: { $gte: start, $lt: end } } },
        },
      },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$total" } } },
    ]),
  ]);
  return {
    orders: created[0]?.count ?? 0,
    paidOrders: paid[0]?.count ?? 0,
    revenue: paid[0]?.amount ?? 0,
  };
}

export async function buildDashboard(now = new Date()): Promise<Dashboard> {
  const day = nepalDay(now);
  const todayRange = nepalDayRange(day);
  const monthRange = nepalMonthRange(day);

  const [today, month, pending, byStatus, top, reviewCount, latestReviews] = await Promise.all([
    periodStats(todayRange),
    periodStats(monthRange),
    OrderModel.aggregate<{ count: number; amount: number }>([
      { $match: { status: "pending_payment" } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$total" } } },
    ]),
    OrderModel.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: monthRange.start, $lt: monthRange.end } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    OrderModel.aggregate<{ _id: string; quantity: number }>([
      {
        $match: {
          createdAt: { $gte: monthRange.start, $lt: monthRange.end },
          status: { $ne: "cancelled" },
        },
      },
      { $unwind: "$items" },
      { $group: { _id: "$items.title", quantity: { $sum: "$items.quantity" } } },
      { $sort: { quantity: -1, _id: 1 } },
      { $limit: 5 },
    ]),
    ReviewModel.countDocuments({ status: "pending" }),
    ReviewModel.find({ status: "pending" }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  return {
    generatedAt: now.toISOString(),
    today: { day, ...today },
    month: { month: monthRange.month, ...month },
    pendingPayments: { count: pending[0]?.count ?? 0, amount: pending[0]?.amount ?? 0 },
    ordersByStatus: Object.fromEntries(
      ALL_STATUSES.map((status) => [
        status,
        byStatus.find((row) => row._id === status)?.count ?? 0,
      ]),
    ),
    topProducts: top.map((row) => ({ title: row._id, quantity: row.quantity })),
    reviewsAwaitingApproval: {
      count: reviewCount,
      latest: latestReviews.map((review) => ({
        id: String(review._id),
        name: review.name,
        rating: review.rating,
        comment: review.comment.slice(0, 200),
        createdAt: new Date(review.createdAt).toISOString(),
      })),
    },
  };
}
