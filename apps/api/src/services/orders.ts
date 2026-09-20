import {
  canTransitionOrderStatus,
  isFeatureOn,
  type CreateOrderInput,
  type OrderStatus,
} from "@momento/shared";
import { HttpError } from "../middleware/errorHandler";
import { CouponModel } from "../models/Coupon";
import { GiftCardModel } from "../models/GiftCard";
import { OrderModel } from "../models/Order";
import { ProductModel } from "../models/Product";
import { ReferralUseModel } from "../models/Referral";
import { computeOrderTotals, type PricingProduct } from "./orderPricing";
import { nextOrderCode } from "./orderCode";
import {
  claimGiftCard,
  claimReferral,
  findReferral,
  issueReferralCode,
  issueReferrerReward,
  phoneHash,
  referralSettings,
  releaseGiftCard,
  releaseReferral,
} from "./promotions";
import { getSettings } from "./settings";

/** Compares phones by their last 10 digits so +977 98… and 98… match. */
export function samePhone(a: string, b: string): boolean {
  const tail = (value: string): string => value.replace(/\D/g, "").slice(-10);
  return tail(a).length >= 7 && tail(a) === tail(b);
}

async function loadPricingProducts(ids: string[]): Promise<Map<string, PricingProduct>> {
  const docs = await ProductModel.find({ _id: { $in: ids } });
  return new Map(
    docs.map((doc) => [
      doc.id as string,
      {
        id: doc.id as string,
        title: doc.title,
        image: doc.images[0],
        basePrice: doc.basePrice,
        isActive: doc.isActive,
        variants: doc.variants.map((variant) => ({
          id: variant.id as string,
          size: variant.size,
          cover: variant.cover,
          pages: variant.pages,
          price: variant.price,
        })),
      },
    ]),
  );
}

export async function createOrder(input: CreateOrderInput) {
  const productIds = [...new Set(input.items.map((item) => item.productId))];
  const [products, settings] = await Promise.all([loadPricingProducts(productIds), getSettings()]);

  // Phase 8 features answer 400 while their flag is off, so a switched-off feature cannot be used.
  const referralsOn = isFeatureOn(settings, "referrals");
  if (input.referralCode && !referralsOn) {
    throw new HttpError(400, "Referral codes are not available");
  }
  if (input.giftCardCode && !isFeatureOn(settings, "giftCards")) {
    throw new HttpError(400, "Gift cards are not available");
  }

  const coupon = input.couponCode
    ? await CouponModel.findOne({ code: input.couponCode })
    : undefined;
  if (input.couponCode && !coupon) throw new HttpError(400, "Coupon not found");

  const giftCard = input.giftCardCode
    ? await GiftCardModel.findOne({ code: input.giftCardCode })
    : null;
  if (input.giftCardCode && (!giftCard || !giftCard.isActive)) {
    throw new HttpError(400, "Gift card not found");
  }
  if (giftCard && giftCard.balance <= 0) throw new HttpError(400, "Gift card has no balance left");

  const referral = input.referralCode ? await findReferral(input.referralCode) : null;

  const totals = computeOrderTotals(input, products, settings, coupon ?? undefined, new Date(), {
    referralDiscount: referral ? referralSettings(settings).friendDiscount : 0,
    giftCardBalance: giftCard?.balance ?? 0,
  });

  // Every claim below is undone if a later step fails, so a failed order never keeps a coupon use,
  // a referral or gift card money.
  const undo: Array<() => Promise<void>> = [];
  try {
    // Claim one coupon use atomically so concurrent orders cannot exceed usageLimit.
    if (coupon) {
      const claimed = await CouponModel.findOneAndUpdate(
        {
          _id: coupon._id,
          isActive: true,
          $or: [
            { usageLimit: { $exists: false } },
            { $expr: { $lt: ["$usedCount", "$usageLimit"] } },
          ],
        },
        { $inc: { usedCount: 1 } },
      );
      if (!claimed) throw new HttpError(400, "Coupon usage limit reached");
      undo.push(async () => {
        await CouponModel.updateOne({ _id: coupon._id }, { $inc: { usedCount: -1 } });
      });
    }

    if (referral && input.referralCode) {
      undo.push(await claimReferral(input.referralCode, input.customer.phone));
    }

    if (giftCard && totals.giftCardApplied > 0) {
      if (!(await claimGiftCard(giftCard._id, totals.giftCardApplied))) {
        throw new HttpError(409, "The gift card balance changed. Please try again.");
      }
      undo.push(() => releaseGiftCard(giftCard.code, totals.giftCardApplied));
    }

    const code = await nextOrderCode();
    const order = await OrderModel.create({
      code,
      customer: input.customer,
      items: totals.lines,
      subtotal: totals.subtotal,
      deliveryFee: totals.deliveryFee,
      discount: totals.discount,
      couponCode: coupon?.code,
      referralCode: referral?.code,
      referralDiscount: totals.referralDiscount,
      giftCardCode: giftCard && totals.giftCardApplied > 0 ? giftCard.code : undefined,
      giftCardApplied: totals.giftCardApplied,
      phoneHash: referralsOn ? phoneHash(input.customer.phone) : undefined,
      total: totals.total,
      status: "pending_payment",
      paymentMethod: input.paymentMethod,
      note: input.note,
      photos: input.photos,
      statusHistory: [{ status: "pending_payment", at: new Date() }],
    });
    if (referral) {
      await ReferralUseModel.updateOne(
        { phoneHash: phoneHash(input.customer.phone), referralCode: referral.code },
        { $set: { orderCode: order.code } },
      );
    }
    return order;
  } catch (error) {
    for (const rollback of undo.reverse()) await rollback().catch(() => undefined);
    throw error;
  }
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
  adminNotes: string | undefined,
  actorId: string,
) {
  const order = await OrderModel.findById(id);
  if (!order) throw new HttpError(404, "Order not found");
  if (!canTransitionOrderStatus(order.status as OrderStatus, status)) {
    throw new HttpError(409, `Cannot change order from ${order.status} to ${status}`, {
      from: order.status,
      to: status,
    });
  }

  // Filtering on the current status makes the transition atomic against concurrent updates.
  const updated = await OrderModel.findOneAndUpdate(
    { _id: id, status: order.status },
    {
      $set: { status, ...(adminNotes !== undefined ? { adminNotes } : {}) },
      $push: { statusHistory: { status, at: new Date(), by: actorId } },
    },
    { new: true },
  );
  if (!updated) throw new HttpError(409, "Order was changed by someone else; reload and retry");

  if (status === "cancelled" && order.couponCode) {
    await CouponModel.updateOne(
      { code: order.couponCode, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } },
    );
  }
  if (status === "cancelled") {
    // Money and referral uses go back, whatever the flags say now: they were taken when the order was placed.
    if (order.giftCardCode) await releaseGiftCard(order.giftCardCode, order.giftCardApplied ?? 0);
    if (order.referralCode) await releaseReferral(order.referralCode, order.customer?.phone ?? "");
  }
  if (status === "delivered") {
    const settings = await getSettings();
    if (isFeatureOn(settings, "referrals")) {
      // The customer earns a code to share, and a referred friend's delivery rewards whoever referred them.
      await issueReferralCode(order.customer?.phone ?? "");
      await issueReferrerReward(order, settings);
    }
  }
  return updated;
}
