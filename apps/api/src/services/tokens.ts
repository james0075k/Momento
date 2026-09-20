import { randomUUID } from "node:crypto";
import { userRoleSchema } from "@momento/shared";
import jwt from "jsonwebtoken";
import { requireEnv } from "../config/env";
import type { AuthUser } from "../middleware/auth";
import { ACCESS_TTL_SECONDS, REFRESH_TTL_SECONDS } from "./cookies";

export function signAccessToken(user: AuthUser): string {
  return jwt.sign({ role: user.role }, requireEnv("JWT_ACCESS_SECRET"), {
    subject: user.id,
    expiresIn: ACCESS_TTL_SECONDS,
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string): AuthUser {
  const payload = jwt.verify(token, requireEnv("JWT_ACCESS_SECRET"), { algorithms: ["HS256"] });
  if (typeof payload === "string" || !payload.sub) throw new Error("Bad token");
  const role = userRoleSchema.parse(payload.role);
  return { id: payload.sub, role };
}

export interface RefreshPayload {
  userId: string;
  jti: string;
  familyId: string;
}

export function signRefreshToken(userId: string, familyId: string): { token: string; jti: string } {
  const jti = randomUUID();
  const token = jwt.sign({ fid: familyId }, requireEnv("JWT_REFRESH_SECRET"), {
    subject: userId,
    jwtid: jti,
    expiresIn: REFRESH_TTL_SECONDS,
    algorithm: "HS256",
  });
  return { token, jti };
}

export function verifyRefreshToken(token: string): RefreshPayload {
  const payload = jwt.verify(token, requireEnv("JWT_REFRESH_SECRET"), { algorithms: ["HS256"] });
  if (typeof payload === "string" || !payload.sub || !payload.jti) throw new Error("Bad token");
  const familyId = (payload as { fid?: unknown }).fid;
  if (typeof familyId !== "string") throw new Error("Bad token");
  return { userId: payload.sub, jti: payload.jti, familyId };
}
