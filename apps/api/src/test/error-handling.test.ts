import express, { type Express } from "express";
import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { errorHandler } from "../middleware/errorHandler";
import { anon, testApp } from "./helpers";

/** A tiny app whose only route throws whatever it is given, to see what the client would get. */
function throwing(make: () => unknown): Express {
  const app = express();
  app.get("/boom", () => {
    throw make();
  });
  app.get("/late", (_req, res) => {
    res.write("partial");
    throw new Error("after the answer started");
  });
  app.use(errorHandler);
  return app;
}

describe("error handler", () => {
  it("turns a schema validation failure into a 400 with field messages only", async () => {
    const res = await request(
      throwing(() => {
        const error = new mongoose.Error.ValidationError();
        error.addError(
          "title",
          new mongoose.Error.ValidatorError({ message: "Title is required" }),
        );
        return error;
      }),
    ).get("/boom");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "Validation failed",
      details: { fieldErrors: { title: ["Title is required"] } },
    });
  });

  it.each([
    ["MongoNetworkError", "connection 5 to db.example:27017 closed"],
    ["MongooseServerSelectionError", "Server selection timed out after 5000 ms"],
    ["MongooseError", "Operation `orders.find()` buffering timed out after 5000ms"],
  ])(
    "answers a database outage (%s) with 503, a retry hint and no internals",
    async (name, message) => {
      const res = await request(throwing(() => Object.assign(new Error(message), { name }))).get(
        "/boom",
      );
      expect(res.status).toBe(503);
      expect(res.headers["retry-after"]).toBe("5");
      expect(res.body).toEqual({
        error: "The shop is busy right now. Please try again in a moment.",
      });
      expect(JSON.stringify(res.body)).not.toContain("db.example");
    },
  );

  it("closes the connection instead of writing JSON once the answer has started", async () => {
    // A half-sent answer cannot be replaced by an error body; the client sees the failure, not a mixed reply.
    await expect(request(throwing(() => new Error("x"))).get("/late")).rejects.toThrow();
  });
});

describe("request ids", () => {
  it("every answer carries an X-Request-Id, and each request gets its own", async () => {
    const app = testApp();
    const first = await anon(app).get("/health");
    const second = await anon(app).get("/health");
    expect(first.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(second.headers["x-request-id"]).not.toBe(first.headers["x-request-id"]);
  });
});
