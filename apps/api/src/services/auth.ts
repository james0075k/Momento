import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import { HttpError } from "../middleware/errorHandler";
import { RefreshTokenModel } from "../models/RefreshToken";
import { UserModel } from "../models/User";
import { REFRESH_TTL_SECONDS } from "./cookies";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "./tokens";

export interface IssuedTokens {
  access: string;
  refresh: string;
}

// Verified against when the email is unknown so response time does not reveal which emails exist.
const DUMMY_HASH = await argon2.hash("momento-dummy-password");

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password);
}

async function issueTokens(
  user: { id: string; role: "admin" | "staff" },
  familyId: string,
): Promise<IssuedTokens> {
  const { token, jti } = signRefreshToken(user.id, familyId);
  await RefreshTokenModel.create({
    userId: user.id,
    jti,
    familyId,
    expiresAt: new Date(Date.now() + REFRESH_TTL_SECONDS * 1000),
  });
  return { access: signAccessToken(user), refresh: token };
}

export async function login(email: string, password: string) {
  const user = await UserModel.findOne({ email }).select("+passwordHash");
  const ok = await argon2.verify(user?.passwordHash ?? DUMMY_HASH, password);
  if (!user || !ok) throw new HttpError(401, "Invalid email or password");

  const tokens = await issueTokens({ id: user.id as string, role: user.role }, randomUUID());
  return { user, tokens };
}

/**
 * Rotates a refresh token: the presented token is revoked and a new one issued in the same family.
 * Presenting an already-revoked token means it was stolen or replayed, so the whole family is revoked.
 */
export async function rotateRefreshToken(token: string): Promise<IssuedTokens> {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new HttpError(401, "Invalid refresh token");
  }

  const user = await UserModel.findById(payload.userId);
  if (!user) throw new HttpError(401, "Invalid refresh token");

  const next = await issueTokens({ id: user.id as string, role: user.role }, payload.familyId);
  const nextPayload = verifyRefreshToken(next.refresh);

  // Atomic: only one request can flip revokedAt from unset to set.
  const revoked = await RefreshTokenModel.findOneAndUpdate(
    { jti: payload.jti, familyId: payload.familyId, revokedAt: { $exists: false } },
    { $set: { revokedAt: new Date(), replacedBy: nextPayload.jti } },
  );

  if (!revoked) {
    await RefreshTokenModel.updateMany(
      { familyId: payload.familyId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
    throw new HttpError(401, "Refresh token reuse detected; please log in again");
  }
  return next;
}

export async function revokeRefreshFamily(token: string | undefined): Promise<void> {
  if (!token) return;
  try {
    const { familyId } = verifyRefreshToken(token);
    await RefreshTokenModel.updateMany(
      { familyId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
  } catch {
    // Invalid or expired token: nothing to revoke.
  }
}
