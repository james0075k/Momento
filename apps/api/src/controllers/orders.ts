import {
  isFeatureOn,
  type CouponValidateInput,
  type CreateOrderInput,
  type OrderListQuery,
  type TrackOrderInput,
  type UpdateOrderNotesInput,
  type UpdateOrderStatusInput,
} from "@momento/shared";
import { asyncHandler } from "../middleware/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { CouponModel } from "../models/Coupon";
import { OrderModel } from "../models/Order";
import { couponDiscount } from "../services/orderPricing";
import { createOrder, samePhone, updateOrderNotes, updateOrderStatus } from "../services/orders";
import { escapeRegex, paginated, skipFor } from "../services/pagination";
import { referralSummary } from "../services/promotions";
import { customerReplyLink, teamShareLink } from "../services/whatsappLinks";
import { getSettings } from "../services/settings";

export const orderController = {
  create: asyncHandler(async (req, res) => {
    const order = await createOrder(req.body as CreateOrderInput);
    res.status(201).json({ data: order });
  }),

  list: asyncHandler(async (req, res) => {
    const query = req.query as unknown as OrderListQuery;
    const filter: Record<string, unknown> = {};
    if (query.status) filter["status"] = query.status;
    if (query.q && /^MOM-/i.test(query.q)) {
      // An order code (or the start of one) is matched from its first character, so the unique index on
      // `code` answers it instead of a scan of every order.
      filter["code"] = new RegExp(`^${escapeRegex(query.q.toUpperCase())}`);
    } else if (query.q) {
      const pattern = new RegExp(escapeRegex(query.q), "i");
      filter["$or"] = [
        { code: pattern },
        { "customer.name": pattern },
        { "customer.phone": pattern },
      ];
    }
    const [docs, total] = await Promise.all([
      OrderModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skipFor(query.page, query.limit))
        .limit(query.limit),
      OrderModel.countDocuments(filter),
    ]);
    res.json(paginated(docs, query.page, query.limit, total));
  }),

  get: asyncHandler(async (req, res) => {
    const order = await OrderModel.findById((req.params as { id: string }).id);
    if (!order) throw new HttpError(404, "Order not found");
    res.json({ data: order });
  }),

  /** Staff (flag orderAlerts): ready-made WhatsApp links for this order. */
  whatsapp: asyncHandler(async (req, res) => {
    const order = await OrderModel.findById((req.params as { id: string }).id).lean();
    if (!order) throw new HttpError(404, "Order not found");
    res.json({
      data: { customerReply: customerReplyLink(order), teamShare: teamShareLink(order) },
    });
  }),

  updateStatus: asyncHandler(async (req, res) => {
    const body = req.body as UpdateOrderStatusInput;
    const order = await updateOrderStatus(
      (req.params as { id: string }).id,
      body.status,
      body.adminNotes,
      req.user!.id,
    );
    res.json({ data: order });
  }),

  updateNotes: asyncHandler(async (req, res) => {
    const { adminNotes } = req.body as UpdateOrderNotesInput;
    res.json({ data: await updateOrderNotes((req.params as { id: string }).id, adminNotes) });
  }),

  /** Public. Needs both the code and the phone it was placed with; returns no address. */
  track: asyncHandler(async (req, res) => {
    const { code, phone } = req.body as TrackOrderInput;
    const order = await OrderModel.findOne({ code });
    if (!order || !samePhone(order.customer?.phone ?? "", phone)) {
      throw new HttpError(404, "No order matches that code and phone");
    }
    const settings = await getSettings();
    const referral = isFeatureOn(settings, "referrals")
      ? await referralSummary(phone, settings)
      : undefined;
    res.json({
      data: {
        code: order.code,
        status: order.status,
        items: order.items.map((item) => ({
          // Ids let the order again button rebuild the cart. They are public product ids.
          productId: String(item.productId),
          variantId: item.variantId ? String(item.variantId) : undefined,
          title: item.title,
          variantLabel: item.variantLabel,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        discount: order.discount,
        // Zero, and absent below, while the referral and gift card features are off.
        referralDiscount: order.referralDiscount ?? 0,
        giftCardApplied: order.giftCardApplied ?? 0,
        total: order.total,
        statusHistory: order.statusHistory.map(({ status, at }) => ({ status, at })),
        createdAt: order.createdAt,
        referral,
      },
    });
  }),
};

export const couponPublicController = {
  validate: asyncHandler(async (req, res) => {
    const { code, subtotal } = req.body as CouponValidateInput;
    const coupon = await CouponModel.findOne({ code });
    if (!coupon) throw new HttpError(404, "Coupon not found");
    const discount = couponDiscount(coupon, subtotal);
    res.json({ data: { code: coupon.code, discount } });
  }),
};
