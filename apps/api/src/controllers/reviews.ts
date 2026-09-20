import type { ReviewInput, ReviewListQuery, ReviewModeration } from "@momento/shared";
import { asyncHandler } from "../middleware/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { OrderModel } from "../models/Order";
import { ProductModel } from "../models/Product";
import { ReviewModel } from "../models/Review";
import { ServiceModel } from "../models/Service";
import { samePhone } from "../services/orders";
import { paginated, skipFor } from "../services/pagination";

/** Public callers never see which order verified a review. */
function publicView(review: { toJSON(): Record<string, unknown> }): Record<string, unknown> {
  const { verifiedOrderCode: _hidden, ...rest } = review.toJSON();
  return rest;
}

export const reviewController = {
  /** Public sees approved reviews only. Staff can filter by any status. */
  list: asyncHandler(async (req, res) => {
    const query = req.query as unknown as ReviewListQuery;
    const filter: Record<string, unknown> = {};
    if (!req.user) filter["status"] = "approved";
    else if (query.status) filter["status"] = query.status;
    if (query.productId) filter["productId"] = query.productId;
    if (query.serviceId) filter["serviceId"] = query.serviceId;

    const [docs, total] = await Promise.all([
      ReviewModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skipFor(query.page, query.limit))
        .limit(query.limit),
      ReviewModel.countDocuments(filter),
    ]);
    const data: unknown[] = req.user ? docs : docs.map(publicView);
    res.json(paginated(data, query.page, query.limit, total));
  }),

  /** Public. Always created as pending; only staff can approve it. */
  create: asyncHandler(async (req, res) => {
    const input = req.body as ReviewInput;

    const target = input.productId
      ? await ProductModel.exists({ _id: input.productId })
      : await ServiceModel.exists({ _id: input.serviceId });
    if (!target) throw new HttpError(400, "The item you are reviewing does not exist");

    let verifiedOrderCode: string | undefined;
    if (input.orderCode && input.orderPhone && input.productId) {
      const order = await OrderModel.findOne({
        code: input.orderCode,
        "items.productId": input.productId,
      });
      if (order && samePhone(order.customer?.phone ?? "", input.orderPhone)) {
        verifiedOrderCode = order.code;
      }
    }

    const review = await ReviewModel.create({
      productId: input.productId,
      serviceId: input.serviceId,
      name: input.name,
      rating: input.rating,
      title: input.title,
      comment: input.comment,
      photos: input.photos,
      status: "pending",
      verified: Boolean(verifiedOrderCode),
      verifiedOrderCode,
    });
    res.status(201).json({ data: publicView(review) });
  }),

  moderate: asyncHandler(async (req, res) => {
    const { status } = req.body as ReviewModeration;
    const review = await ReviewModel.findByIdAndUpdate(
      (req.params as { id: string }).id,
      { $set: { status } },
      { new: true },
    );
    if (!review) throw new HttpError(404, "Review not found");
    res.json({ data: review });
  }),

  remove: asyncHandler(async (req, res) => {
    const review = await ReviewModel.findByIdAndDelete((req.params as { id: string }).id);
    if (!review) throw new HttpError(404, "Review not found");
    res.status(204).end();
  }),
};
