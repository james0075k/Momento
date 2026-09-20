import { asyncHandler } from "../middleware/asyncHandler";
import { buildDashboard } from "../services/dashboard";

export const statsController = {
  /** Staff and admin. Numbers for the admin dashboard, computed for Nepal days and months. */
  dashboard: asyncHandler(async (_req, res) => {
    res.json({ data: await buildDashboard() });
  }),
};
