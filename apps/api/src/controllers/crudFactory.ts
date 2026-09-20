import { objectIdSchema } from "@momento/shared";
import type { Request, Response } from "express";
import type { Model } from "mongoose";
import { asyncHandler } from "../middleware/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { paginated, skipFor } from "../services/pagination";

// Controllers only use generic Mongoose calls, so the document shape does not matter here.
type AnyModel = Model<Record<string, unknown>>;

export interface CrudOptions {
  /** Cast at the call site: `ProductModel as unknown as AnyModel`. */
  model: AnyModel;
  label: string;
  /** Field that hides rows from the public. Staff/admin see everything with includeInactive=true. */
  activeField?: "isActive" | "isVisible";
  /** When true, GET /:id also accepts a slug. */
  slugged?: boolean;
  sort: Record<string, 1 | -1>;
  /** Extra list filters derived from the (already validated) query. */
  extraFilter?: (query: Record<string, unknown>) => Record<string, unknown>;
}

interface ListQuery {
  page: number;
  limit: number;
  includeInactive?: boolean;
}

export function crudController(options: CrudOptions) {
  const { model, label, activeField, slugged, sort } = options;

  const visibilityFilter = (req: Request, includeInactive?: boolean): Record<string, unknown> =>
    activeField && !(req.user && includeInactive) ? { [activeField]: true } : {};

  return {
    list: asyncHandler(async (req, res) => {
      const query = req.query as unknown as ListQuery & Record<string, unknown>;
      const filter = {
        ...visibilityFilter(req, query.includeInactive),
        ...options.extraFilter?.(query),
      };
      const [docs, total] = await Promise.all([
        model.find(filter).sort(sort).skip(skipFor(query.page, query.limit)).limit(query.limit),
        model.countDocuments(filter),
      ]);
      res.json(paginated(docs, query.page, query.limit, total));
    }),

    get: asyncHandler(async (req, res) => {
      const key = String((req.params as { id: string }).id);
      const doc =
        slugged && !objectIdSchema.safeParse(key).success
          ? await model.findOne({ slug: key })
          : await model.findById(key);
      const hidden =
        doc &&
        activeField &&
        !req.user &&
        (doc as unknown as Record<string, unknown>)[activeField] === false;
      if (!doc || hidden) throw new HttpError(404, `${label} not found`);
      res.json({ data: doc });
    }),

    create: asyncHandler(async (req: Request, res: Response) => {
      const doc = await model.create(req.body as Record<string, unknown>);
      res.status(201).json({ data: doc });
    }),

    update: asyncHandler(async (req, res) => {
      const doc = await model.findByIdAndUpdate(
        (req.params as { id: string }).id,
        { $set: req.body as Record<string, unknown> },
        { new: true, runValidators: true },
      );
      if (!doc) throw new HttpError(404, `${label} not found`);
      res.json({ data: doc });
    }),

    remove: asyncHandler(async (req, res) => {
      const doc = await model.findByIdAndDelete((req.params as { id: string }).id);
      if (!doc) throw new HttpError(404, `${label} not found`);
      res.status(204).end();
    }),
  };
}

export type { AnyModel };
