import type { Express } from "express";
import request from "supertest";
import { createApp, type RateLimitOptions } from "../app";
import { CategoryModel } from "../models/Category";
import { ProductModel } from "../models/Product";
import { UserModel } from "../models/User";
import { hashPassword } from "../services/auth";

export const CSRF = { "X-Requested-With": "momento" } as const;
export const PASSWORD = "correct-horse-battery";

const HIGH_LIMITS: RateLimitOptions = {
  login: 1000,
  createOrder: 1000,
  createReview: 1000,
  lookup: 1000,
  upload: 1000,
};

/** App with generous rate limits so unrelated tests never hit them. */
export function testApp(limits: Partial<RateLimitOptions> = {}): Express {
  return createApp({ rateLimits: { ...HIGH_LIMITS, ...limits } });
}

export async function createUser(role: "admin" | "staff", email = `${role}@momento.test`) {
  return UserModel.create({
    name: `${role} user`,
    email,
    role,
    passwordHash: await hashPassword(PASSWORD),
  });
}

/** A supertest agent that is logged in and sends the CSRF header on every request. */
export async function loginAs(app: Express, role: "admin" | "staff") {
  const user = await createUser(role);
  const agent = request.agent(app);
  const res = await agent
    .post("/auth/login")
    .set(CSRF)
    .send({ email: user.email, password: PASSWORD });
  if (res.status !== 200)
    throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return {
    user,
    get: (url: string) => agent.get(url).set(CSRF),
    post: (url: string) => agent.post(url).set(CSRF),
    patch: (url: string) => agent.patch(url).set(CSRF),
    put: (url: string) => agent.put(url).set(CSRF),
    delete: (url: string) => agent.delete(url).set(CSRF),
  };
}

/** Anonymous requests that still send the CSRF header, like the real web client. */
export function anon(app: Express) {
  return {
    get: (url: string) => request(app).get(url).set(CSRF),
    post: (url: string) => request(app).post(url).set(CSRF),
    patch: (url: string) => request(app).patch(url).set(CSRF),
    put: (url: string) => request(app).put(url).set(CSRF),
    delete: (url: string) => request(app).delete(url).set(CSRF),
  };
}

export async function createCatalog() {
  const category = await CategoryModel.create({ name: "Photo Books", slug: "photo-books" });
  const book = await ProductModel.create({
    title: "Classic Photo Book",
    slug: "classic-photo-book",
    categoryId: category._id,
    description: "Hardcover lay-flat album",
    basePrice: 1000,
    variants: [
      { size: "A5", cover: "Softcover", pages: 20, price: 1500 },
      { size: "A4", cover: "Hardcover", pages: 40, price: 2500 },
    ],
  });
  const magnet = await ProductModel.create({
    title: "Photo Magnet",
    slug: "photo-magnet",
    categoryId: category._id,
    basePrice: 250,
  });
  return { category, book, magnet };
}

export function customer(area: "inside_valley" | "outside_valley" = "inside_valley") {
  return { name: "Sita Sharma", phone: "9812345678", address: "Baneshwor, Kathmandu", area };
}

/** Pulls `name=value` cookie pairs out of a supertest response. */
export function cookiesFrom(res: request.Response): Record<string, string> {
  const raw = res.headers["set-cookie"] as unknown as string[] | undefined;
  const out: Record<string, string> = {};
  for (const header of raw ?? []) {
    const [pair] = header.split(";");
    const [name, ...value] = (pair ?? "").split("=");
    if (name) out[name] = value.join("=");
  }
  return out;
}
