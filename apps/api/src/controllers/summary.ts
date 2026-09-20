import type { DailySummaryQuery, SendSummaryInput } from "@momento/shared";
import { asyncHandler } from "../middleware/asyncHandler";
import { OrderModel } from "../models/Order";
import { sendSummaryEmail } from "../services/email";
import { buildDailySummary } from "../services/summary";
import { renderSummaryEmail } from "../services/summaryEmail";

export const summaryController = {
  /** Staff preview of a day, and what the admin panel will show. Sends nothing. */
  daily: asyncHandler(async (req, res) => {
    const { day } = req.query as unknown as DailySummaryQuery;
    const { summary } = await buildDailySummary({ day });
    res.json({ data: summary });
  }),

  /** Called by the scheduler. Sends the email, then marks the review requests it included. */
  send: asyncHandler(async (req, res) => {
    const { day, dryRun } = req.body as SendSummaryInput;
    const { summary, reviewRequestOrderIds } = await buildDailySummary({ day });
    if (dryRun) {
      res.json({ data: { sent: false, summary } });
      return;
    }
    // Throws 503 (not configured) or 502 (refused), and then nothing below runs: a failed send
    // marks no order, so the same review requests are offered again in the next email.
    await sendSummaryEmail(renderSummaryEmail(summary));
    if (reviewRequestOrderIds.length > 0) {
      await OrderModel.updateMany(
        { _id: { $in: reviewRequestOrderIds } },
        { $set: { reviewRequestSentAt: new Date() } },
      );
    }
    res.json({ data: { sent: true, summary } });
  }),
};
