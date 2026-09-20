import type {
  GiftCardBalanceInput,
  GiftCardInput,
  GiftCardUpdate,
  ReferralValidateInput,
} from "@momento/shared";
import { asyncHandler } from "../middleware/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { GiftCardModel } from "../models/GiftCard";
import { paginated, skipFor } from "../services/pagination";
import { findReferral, generateGiftCardCode, referralSettings } from "../services/promotions";
import { getSettings } from "../services/settings";

export const referralController = {
  /** Public. Tells the checkout a code is real and what it takes off. Never says whose it is. */
  validate: asyncHandler(async (req, res) => {
    const { code } = req.body as ReferralValidateInput;
    const referral = await findReferral(code);
    const { friendDiscount } = referralSettings(await getSettings());
    res.json({ data: { code: referral.code, discount: friendDiscount } });
  }),
};

export const giftCardController = {
  /** Public, rate limited. Unknown and switched-off cards look the same, so codes cannot be probed. */
  balance: asyncHandler(async (req, res) => {
    const { code } = req.body as GiftCardBalanceInput;
    const card = await GiftCardModel.findOne({ code });
    if (!card || !card.isActive) throw new HttpError(404, "Gift card not found");
    res.json({ data: { code: card.code, balance: card.balance } });
  }),

  list: asyncHandler(async (req, res) => {
    const { page, limit } = req.query as unknown as { page: number; limit: number };
    const [docs, total] = await Promise.all([
      GiftCardModel.find().sort({ createdAt: -1 }).skip(skipFor(page, limit)).limit(limit),
      GiftCardModel.countDocuments(),
    ]);
    res.json(paginated(docs, page, limit, total));
  }),

  /** Admin issues a card after the customer has paid, since payment is manual. */
  create: asyncHandler(async (req, res) => {
    const input = req.body as GiftCardInput;
    // A generated code that collides is retried; a code chosen by the admin that collides is a 409.
    for (let attempt = 0; attempt < (input.code ? 1 : 5); attempt += 1) {
      try {
        const card = await GiftCardModel.create({
          code: input.code ?? generateGiftCardCode(),
          initialAmount: input.amount,
          balance: input.amount,
          note: input.note,
        });
        res.status(201).json({ data: card });
        return;
      } catch (err) {
        if ((err as { code?: unknown }).code !== 11000) throw err;
      }
    }
    throw new HttpError(409, "Already exists");
  }),

  update: asyncHandler(async (req, res) => {
    const card = await GiftCardModel.findByIdAndUpdate(
      (req.params as { id: string }).id,
      { $set: req.body as GiftCardUpdate },
      { new: true },
    );
    if (!card) throw new HttpError(404, "Gift card not found");
    res.json({ data: card });
  }),
};
