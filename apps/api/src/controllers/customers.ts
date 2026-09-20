import type { Customer, CustomerListQuery } from "@momento/shared";
import { asyncHandler } from "../middleware/asyncHandler";
import { OrderModel } from "../models/Order";
import { escapeRegex, paginated, skipFor } from "../services/pagination";

interface CustomerRow extends Omit<Customer, "firstOrderAt" | "lastOrderAt"> {
  firstOrderAt: Date;
  lastOrderAt: Date;
}

export const customerController = {
  /**
   * Staff. Customers are worked out from orders: one row per phone (last 10 digits), newest name and
   * phone format winning. Nothing is stored, so there is no second copy of personal data to protect.
   */
  list: asyncHandler(async (req, res) => {
    const { q, page, limit } = req.query as unknown as CustomerListQuery;
    const pattern = q ? new RegExp(escapeRegex(q), "i") : undefined;
    // Phones are stored as digits with an optional leading "+", so dropping the "+" leaves digits only.
    const digits = { $replaceAll: { input: "$customer.phone", find: "+", replacement: "" } };
    const start = { $max: [0, { $subtract: [{ $strLenCP: "$digits" }, 10] }] };

    const [result] = await OrderModel.aggregate<{
      rows: CustomerRow[];
      count: Array<{ total: number }>;
    }>([
      { $sort: { createdAt: 1 } },
      { $addFields: { digits } },
      { $addFields: { key: { $substrCP: ["$digits", start, 10] } } },
      { $match: { key: { $ne: "" } } },
      {
        $group: {
          _id: "$key",
          name: { $last: "$customer.name" },
          phone: { $last: "$customer.phone" },
          orders: { $sum: 1 },
          spent: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 0, "$total"] } },
          firstOrderAt: { $first: "$createdAt" },
          lastOrderAt: { $last: "$createdAt" },
        },
      },
      ...(pattern ? [{ $match: { $or: [{ name: pattern }, { phone: pattern }] } }] : []),
      {
        $facet: {
          rows: [
            { $sort: { lastOrderAt: -1, _id: 1 } },
            { $skip: skipFor(page, limit) },
            { $limit: limit },
            {
              $project: {
                _id: 0,
                key: "$_id",
                name: 1,
                phone: 1,
                orders: 1,
                spent: 1,
                firstOrderAt: 1,
                lastOrderAt: 1,
              },
            },
          ],
          count: [{ $count: "total" }],
        },
      },
    ]);

    const rows = (result?.rows ?? []).map((row) => ({
      ...row,
      firstOrderAt: row.firstOrderAt.toISOString(),
      lastOrderAt: row.lastOrderAt.toISOString(),
    }));
    res.json(paginated(rows, page, limit, result?.count[0]?.total ?? 0));
  }),
};
