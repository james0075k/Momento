import type { RequestHandler } from "express";
import { logger } from "../config/logger";
import { AuditLogModel } from "../models/AuditLog";

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Writes an audit row after any state-changing request from a signed-in user, whatever its outcome
 * (a refused 403 is worth seeing too). It runs on "finish", so a slow or failed audit write can
 * never delay or break the response.
 */
export const auditAdminActions: RequestHandler = (req, res, next) => {
  // Downloading customer data is an admin action too, so exports are recorded like changes are.
  const isExport = req.method === "GET" && /\/export\.csv$/.test(req.path);
  if (MUTATING.has(req.method) || isExport) {
    res.on("finish", () => {
      const user = req.user;
      if (!user) return;
      AuditLogModel.create({
        userId: user.id,
        role: user.role,
        method: req.method,
        path: req.originalUrl.split("?")[0]?.slice(0, 200) ?? "",
        status: res.statusCode,
      }).catch((err: unknown) => logger.warn({ err }, "Could not write audit log"));
    });
  }
  next();
};
