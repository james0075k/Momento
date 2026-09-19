import { healthResponseSchema } from "@momento/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("GET /health", () => {
  it("returns ok status", async () => {
    const app = createApp();
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(healthResponseSchema.safeParse(response.body).success).toBe(true);
  });
});

describe("unknown route", () => {
  it("returns 404", async () => {
    const app = createApp();
    const response = await request(app).get("/does-not-exist");

    expect(response.status).toBe(404);
  });
});
