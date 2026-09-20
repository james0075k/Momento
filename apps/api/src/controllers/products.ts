import { objectIdSchema, type ProductInput, type ProductListQuery } from "@momento/shared";
import type { SortOrder } from "mongoose";
import { asyncHandler } from "../middleware/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { CategoryModel } from "../models/Category";
import { OrderModel } from "../models/Order";
import { ProductModel } from "../models/Product";
import { paginated, skipFor } from "../services/pagination";

/** A pair of products must have been bought together in this many separate orders to be suggested. */
const ALSO_BOUGHT_MIN_ORDERS = 2;
const ALSO_BOUGHT_LIMIT = 4;

const SORTS: Record<ProductListQuery["sort"], Record<string, SortOrder>> = {
  newest: { createdAt: -1 },
  price_asc: { basePrice: 1 },
  price_desc: { basePrice: -1 },
  title: { title: 1 },
};

/** Variant inputs may carry an existing `id`; Mongoose stores it as `_id`. */
function withVariantIds<T extends Partial<ProductInput>>(body: T) {
  if (!body.variants) return body;
  return {
    ...body,
    variants: body.variants.map(({ id, ...variant }) => (id ? { _id: id, ...variant } : variant)),
  };
}

async function assertCategoryExists(categoryId: string | undefined): Promise<void> {
  if (categoryId && !(await CategoryModel.exists({ _id: categoryId }))) {
    throw new HttpError(400, "Category does not exist");
  }
}

export const productController = {
  list: asyncHandler(async (req, res) => {
    const query = req.query as unknown as ProductListQuery;
    const filter: Record<string, unknown> = {};

    if (req.user && query.active !== undefined) filter["isActive"] = query.active;
    else if (!(req.user && query.includeInactive)) filter["isActive"] = true;
    if (query.featured !== undefined) filter["isFeatured"] = query.featured;
    if (query.ids) filter["_id"] = { $in: query.ids };
    if (query.occasion) filter["occasions"] = query.occasion;
    if (query.q) filter["$text"] = { $search: query.q };

    if (query.category) {
      if (objectIdSchema.safeParse(query.category).success) {
        filter["categoryId"] = query.category;
      } else {
        const category = await CategoryModel.findOne({ slug: query.category });
        filter["categoryId"] = category?._id ?? null;
      }
    }

    // With a text query, rank by relevance unless the caller chose an explicit sort.
    const textRank = Boolean(query.q) && query.sort === "newest";
    const find = ProductModel.find(
      filter,
      textRank ? { score: { $meta: "textScore" } } : undefined,
    );
    const sorted = textRank
      ? find.sort({ score: { $meta: "textScore" } })
      : find.sort(SORTS[query.sort]);

    const [docs, total] = await Promise.all([
      sorted.skip(skipFor(query.page, query.limit)).limit(query.limit),
      ProductModel.countDocuments(filter),
    ]);
    res.json(paginated(docs, query.page, query.limit, total));
  }),

  get: asyncHandler(async (req, res) => {
    const key = String((req.params as { id: string }).id);
    const doc = objectIdSchema.safeParse(key).success
      ? await ProductModel.findById(key)
      : await ProductModel.findOne({ slug: key });
    if (!doc || (!doc.isActive && !req.user)) throw new HttpError(404, "Product not found");
    res.json({ data: doc });
  }),

  /**
   * "Customers also bought": products that appear in the same non-cancelled orders as this one.
   * Only products come back, never anything about the orders or the people who placed them.
   */
  alsoBought: asyncHandler(async (req, res) => {
    const key = String((req.params as { id: string }).id);
    const product = objectIdSchema.safeParse(key).success
      ? await ProductModel.findById(key)
      : await ProductModel.findOne({ slug: key });
    if (!product?.isActive) throw new HttpError(404, "Product not found");

    const rows = await OrderModel.aggregate<{ _id: unknown; orders: number }>([
      { $match: { "items.productId": product._id, status: { $ne: "cancelled" } } },
      { $unwind: "$items" },
      { $match: { "items.productId": { $ne: product._id } } },
      { $group: { _id: "$items.productId", orders: { $addToSet: "$_id" } } },
      { $project: { orders: { $size: "$orders" } } },
      { $match: { orders: { $gte: ALSO_BOUGHT_MIN_ORDERS } } },
      { $sort: { orders: -1, _id: 1 } },
      { $limit: ALSO_BOUGHT_LIMIT * 2 },
    ]);
    const candidates = await ProductModel.find({
      _id: { $in: rows.map((row) => row._id) },
      isActive: true,
    });
    const rank = new Map(rows.map((row, index) => [String(row._id), index]));
    const data = candidates
      .sort((a, b) => (rank.get(String(a._id)) ?? 0) - (rank.get(String(b._id)) ?? 0))
      .slice(0, ALSO_BOUGHT_LIMIT);
    res.json({ data });
  }),

  create: asyncHandler(async (req, res) => {
    const body = req.body as ProductInput;
    await assertCategoryExists(body.categoryId);
    const doc = await ProductModel.create(withVariantIds(body));
    res.status(201).json({ data: doc });
  }),

  update: asyncHandler(async (req, res) => {
    const body = req.body as Partial<ProductInput>;
    await assertCategoryExists(body.categoryId);
    const doc = await ProductModel.findByIdAndUpdate(
      (req.params as { id: string }).id,
      { $set: withVariantIds(body) },
      { new: true, runValidators: true },
    );
    if (!doc) throw new HttpError(404, "Product not found");
    res.json({ data: doc });
  }),

  remove: asyncHandler(async (req, res) => {
    const doc = await ProductModel.findByIdAndDelete((req.params as { id: string }).id);
    if (!doc) throw new HttpError(404, "Product not found");
    res.status(204).end();
  }),
};
