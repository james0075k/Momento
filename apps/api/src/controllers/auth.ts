import type { CreateUserInput, LoginInput } from "@momento/shared";
import { asyncHandler } from "../middleware/asyncHandler";
import { HttpError } from "../middleware/errorHandler";
import { UserModel } from "../models/User";
import { hashPassword, login, revokeRefreshFamily, rotateRefreshToken } from "../services/auth";
import { clearAuthCookies, REFRESH_COOKIE, setAuthCookies } from "../services/cookies";

export const authController = {
  login: asyncHandler(async (req, res) => {
    const { email, password } = req.body as LoginInput;
    const { user, tokens } = await login(email, password);
    setAuthCookies(res, tokens.access, tokens.refresh);
    res.json({ data: user });
  }),

  refresh: asyncHandler(async (req, res) => {
    const token: unknown = req.cookies?.[REFRESH_COOKIE];
    if (typeof token !== "string") throw new HttpError(401, "Missing refresh token");
    try {
      const tokens = await rotateRefreshToken(token);
      setAuthCookies(res, tokens.access, tokens.refresh);
      res.status(204).end();
    } catch (error) {
      clearAuthCookies(res);
      throw error;
    }
  }),

  logout: asyncHandler(async (req, res) => {
    await revokeRefreshFamily(req.cookies?.[REFRESH_COOKIE] as string | undefined);
    clearAuthCookies(res);
    res.status(204).end();
  }),

  me: asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.user!.id);
    if (!user) throw new HttpError(401, "Authentication required");
    res.json({ data: user });
  }),

  createUser: asyncHandler(async (req, res) => {
    const { password, ...rest } = req.body as CreateUserInput;
    const user = await UserModel.create({ ...rest, passwordHash: await hashPassword(password) });
    res.status(201).json({ data: user });
  }),
};
