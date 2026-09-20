import {
  dailySummaryQuerySchema,
  orderExportQuerySchema,
  sendSummaryInputSchema,
  giftCardBalanceInputSchema,
  giftCardInputSchema,
  giftCardUpdateSchema,
  referralValidateInputSchema,
  categoryInputSchema,
  categoryUpdateSchema,
  couponInputSchema,
  couponUpdateSchema,
  couponValidateInputSchema,
  createOrderInputSchema,
  createUserInputSchema,
  customerListQuerySchema,
  homeSectionInputSchema,
  homeSectionUpdateSchema,
  idParamsSchema,
  loginInputSchema,
  orderListQuerySchema,
  paginationQuerySchema,
  productInputSchema,
  productListQuerySchema,
  productUpdateSchema,
  queryBooleanSchema,
  reviewInputSchema,
  reviewListQuerySchema,
  reviewModerationSchema,
  reviewReplyInputSchema,
  serviceInputSchema,
  serviceUpdateSchema,
  settingsInputSchema,
  trackOrderInputSchema,
  updateOrderNotesInputSchema,
  updateOrderStatusInputSchema,
} from "@momento/shared";
import { type RequestHandler, Router } from "express";
import { z } from "zod";
import { authController } from "../controllers/auth";
import {
  categoryController,
  couponController,
  homeSectionController,
  serviceController,
} from "../controllers/catalog";
import { customerController } from "../controllers/customers";
import { couponPublicController, orderController } from "../controllers/orders";
import { productController } from "../controllers/products";
import { exportController } from "../controllers/exports";
import { giftCardController, referralController } from "../controllers/promotions";
import { statsController } from "../controllers/stats";
import { summaryController } from "../controllers/summary";
import { reviewController } from "../controllers/reviews";
import { settingsController } from "../controllers/settings";
import { uploadController } from "../controllers/uploads";
import { requireCronSecret } from "../middleware/cronSecret";
import { requireFeature } from "../middleware/feature";
import { adminOnly, authenticate, optionalAuth, staffOrAdmin } from "../middleware/auth";
import { revalidateOnWrite } from "../middleware/revalidate";
import { validate } from "../middleware/validate";
import type { RevalidateTag } from "../services/revalidate";
import { UPLOAD_FOLDERS } from "../services/cloudinary";
import { healthRouter } from "./health";

export interface Limiters {
  login: RequestHandler;
  createOrder: RequestHandler;
  lookup: RequestHandler;
  createReview: RequestHandler;
  upload: RequestHandler;
}

/** :id accepts an ObjectId, or a slug where the resource has one. */
const keyParams = validate({ params: z.object({ id: z.string().min(1).max(120) }) });
const idParams = validate({ params: idParamsSchema });

const listQuery = paginationQuerySchema.extend({ includeInactive: queryBooleanSchema.optional() });
const serviceListQuery = listQuery.extend({ showOnHome: z.enum(["true", "false"]).optional() });

interface CrudRouteOptions {
  controller: {
    list: RequestHandler;
    get: RequestHandler;
    create: RequestHandler;
    update: RequestHandler;
    remove: RequestHandler;
  };
  createSchema: z.ZodTypeAny;
  updateSchema: z.ZodTypeAny;
  listSchema: z.ZodTypeAny;
  /** true: slug lookups allowed on GET /:id. */
  slugged: boolean;
  /** The public data this resource feeds, refreshed on the website after every successful write. */
  tag: RevalidateTag;
}

/** Public reads, staff/admin writes, admin-only deletes. */
function catalogRouter(options: CrudRouteOptions): Router {
  const router = Router();
  router.use(revalidateOnWrite(options.tag));
  const getParams = options.slugged ? keyParams : idParams;
  router.get("/", optionalAuth, validate({ query: options.listSchema }), options.controller.list);
  router.get("/:id", optionalAuth, getParams, options.controller.get);
  router.post(
    "/",
    ...staffOrAdmin,
    validate({ body: options.createSchema }),
    options.controller.create,
  );
  router.patch(
    "/:id",
    ...staffOrAdmin,
    idParams,
    validate({ body: options.updateSchema }),
    options.controller.update,
  );
  router.delete("/:id", ...adminOnly, idParams, options.controller.remove);
  return router;
}

export function buildRoutes(limiters: Limiters): Array<[string, Router]> {
  const categories = catalogRouter({
    controller: categoryController,
    createSchema: categoryInputSchema,
    updateSchema: categoryUpdateSchema,
    listSchema: listQuery,
    slugged: true,
    tag: "categories",
  });

  const services = catalogRouter({
    controller: serviceController,
    createSchema: serviceInputSchema,
    updateSchema: serviceUpdateSchema,
    listSchema: serviceListQuery,
    slugged: true,
    tag: "services",
  });

  const homeSections = catalogRouter({
    controller: homeSectionController,
    createSchema: homeSectionInputSchema,
    updateSchema: homeSectionUpdateSchema,
    listSchema: listQuery,
    slugged: false,
    tag: "home-sections",
  });

  const products = catalogRouter({
    controller: productController,
    createSchema: productInputSchema,
    updateSchema: productUpdateSchema,
    listSchema: productListQuerySchema,
    slugged: true,
    tag: "products",
  });

  // Phase 8 (flag `alsoBought`): answers 404 while the flag is off.
  products.get(
    "/:id/also-bought",
    requireFeature("alsoBought"),
    keyParams,
    productController.alsoBought,
  );

  const coupons = Router();
  coupons.post(
    "/validate",
    limiters.lookup,
    validate({ body: couponValidateInputSchema }),
    couponPublicController.validate,
  );
  coupons.get("/", ...adminOnly, validate({ query: listQuery }), couponController.list);
  coupons.get("/:id", ...adminOnly, idParams, couponController.get);
  coupons.post("/", ...adminOnly, validate({ body: couponInputSchema }), couponController.create);
  coupons.patch(
    "/:id",
    ...adminOnly,
    idParams,
    validate({ body: couponUpdateSchema }),
    couponController.update,
  );
  coupons.delete("/:id", ...adminOnly, idParams, couponController.remove);

  // Phase 8 (flags `referrals`, `giftCards`): each router answers 404 while its flag is off.
  const referrals = Router();
  referrals.use(requireFeature("referrals"));
  referrals.post(
    "/validate",
    limiters.lookup,
    validate({ body: referralValidateInputSchema }),
    referralController.validate,
  );

  const giftCards = Router();
  giftCards.use(requireFeature("giftCards"));
  giftCards.post(
    "/balance",
    limiters.lookup,
    validate({ body: giftCardBalanceInputSchema }),
    giftCardController.balance,
  );
  giftCards.get(
    "/",
    ...adminOnly,
    validate({ query: paginationQuerySchema }),
    giftCardController.list,
  );
  giftCards.post(
    "/",
    ...adminOnly,
    validate({ body: giftCardInputSchema }),
    giftCardController.create,
  );
  giftCards.patch(
    "/:id",
    ...adminOnly,
    idParams,
    validate({ body: giftCardUpdateSchema }),
    giftCardController.update,
  );

  const orders = Router();
  orders.post(
    "/",
    limiters.createOrder,
    validate({ body: createOrderInputSchema }),
    orderController.create,
  );
  orders.post(
    "/track",
    limiters.lookup,
    validate({ body: trackOrderInputSchema }),
    orderController.track,
  );
  orders.get("/", ...staffOrAdmin, validate({ query: orderListQuerySchema }), orderController.list);
  // Phase 8. Must come before "/:id", or "export.csv" would be read as an order id.
  orders.get(
    "/export.csv",
    requireFeature("csvExport"),
    ...adminOnly,
    validate({ query: orderExportQuerySchema }),
    exportController.orders,
  );
  orders.get(
    "/:id/whatsapp",
    requireFeature("orderAlerts"),
    ...staffOrAdmin,
    idParams,
    orderController.whatsapp,
  );
  orders.get("/:id", ...staffOrAdmin, idParams, orderController.get);
  orders.patch(
    "/:id/status",
    ...staffOrAdmin,
    idParams,
    validate({ body: updateOrderStatusInputSchema }),
    orderController.updateStatus,
  );
  orders.patch(
    "/:id/notes",
    ...staffOrAdmin,
    idParams,
    validate({ body: updateOrderNotesInputSchema }),
    orderController.updateNotes,
  );

  const stats = Router();
  stats.get("/dashboard", ...staffOrAdmin, statsController.dashboard);

  const customers = Router();
  customers.get(
    "/",
    ...staffOrAdmin,
    validate({ query: customerListQuerySchema }),
    customerController.list,
  );
  customers.get(
    "/export.csv",
    requireFeature("csvExport"),
    ...adminOnly,
    exportController.customers,
  );

  const summary = Router();
  summary.use(requireFeature("dailySummary"));
  summary.get(
    "/daily",
    ...staffOrAdmin,
    validate({ query: dailySummaryQuerySchema }),
    summaryController.daily,
  );

  // Called by the scheduler only. Wrong or missing secret, or flag off: 404.
  const internal = Router();
  internal.use(requireFeature("dailySummary"));
  internal.post(
    "/daily-summary",
    requireCronSecret,
    validate({ body: sendSummaryInputSchema }),
    summaryController.send,
  );

  const reviews = Router();
  reviews.use(revalidateOnWrite("reviews"));
  reviews.get("/", optionalAuth, validate({ query: reviewListQuerySchema }), reviewController.list);
  reviews.post(
    "/",
    limiters.createReview,
    validate({ body: reviewInputSchema }),
    reviewController.create,
  );
  reviews.patch(
    "/:id/status",
    ...staffOrAdmin,
    idParams,
    validate({ body: reviewModerationSchema }),
    reviewController.moderate,
  );
  reviews.patch(
    "/:id/reply",
    ...staffOrAdmin,
    idParams,
    validate({ body: reviewReplyInputSchema }),
    reviewController.reply,
  );
  reviews.delete("/:id", ...adminOnly, idParams, reviewController.remove);

  const settings = Router();
  settings.get("/", settingsController.get);
  settings.put(
    "/",
    ...adminOnly,
    validate({ body: settingsInputSchema }),
    settingsController.update,
  );

  const auth = Router();
  auth.post("/login", limiters.login, validate({ body: loginInputSchema }), authController.login);
  auth.post("/refresh", authController.refresh);
  auth.post("/logout", authController.logout);
  auth.get("/me", authenticate, authController.me);
  auth.post(
    "/users",
    ...adminOnly,
    validate({ body: createUserInputSchema }),
    authController.createUser,
  );

  const uploads = Router();
  uploads.post(
    "/signature",
    ...staffOrAdmin,
    validate({ body: z.object({ folder: z.enum(UPLOAD_FOLDERS) }) }),
    uploadController.signature,
  );
  uploads.post("/order-signature", limiters.upload, uploadController.orderSignature);

  return [
    ["/health", healthRouter],
    ["/auth", auth],
    ["/categories", categories],
    ["/products", products],
    ["/services", services],
    ["/home-sections", homeSections],
    ["/orders", orders],
    ["/customers", customers],
    ["/stats", stats],
    ["/summary", summary],
    ["/internal", internal],
    ["/reviews", reviews],
    ["/coupons", coupons],
    ["/referrals", referrals],
    ["/gift-cards", giftCards],
    ["/settings", settings],
    ["/uploads", uploads],
  ];
}
