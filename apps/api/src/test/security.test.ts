import mongoose from "mongoose";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { createApp } from "../app";
import pino from "pino";
import { env } from "../config/env";
import { LOG_REDACT_PATHS } from "../config/logger";
import { AuditLogModel } from "../models";
import { baseCookieOptions } from "../services/cookies";
import { anon, CSRF, loginAs, PASSWORD, testApp } from "./helpers";

async function waitForAudit(count: number): Promise<void> {
  await vi.waitFor(async () =>
    expect(await AuditLogModel.countDocuments()).toBeGreaterThanOrEqual(count),
  );
}

describe("audit log", () => {
  it("records who changed what, without the request body", async () => {
    const app = testApp();
    const admin = await loginAs(app, "admin");
    const res = await admin.post("/categories").send({ name: "Audit Cat", slug: "audit-cat" });
    expect(res.status).toBe(201);
    await waitForAudit(1);

    const [row] = await AuditLogModel.find().lean();
    expect(row).toMatchObject({ role: "admin", method: "POST", path: "/categories", status: 201 });
    expect(String(row?.userId)).toBe(String(admin.user._id));
    expect(JSON.stringify(row)).not.toContain("Audit Cat");
  });

  it("also records refused attempts and ignores reads and anonymous requests", async () => {
    const app = testApp();
    const staff = await loginAs(app, "staff");
    await AuditLogModel.deleteMany({});
    await staff.get("/orders");
    await staff.delete("/categories/000000000000000000000000");
    await anon(app).post("/orders/track").send({});
    await waitForAudit(1);
    const rows = await AuditLogModel.find().lean();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ role: "staff", method: "DELETE", status: 403 });
  });
});

describe("cookies", () => {
  it("are httpOnly, and Secure + SameSite=None in production", () => {
    expect(baseCookieOptions(true, "momento.example")).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: "momento.example",
    });
    expect(baseCookieOptions(false)).toMatchObject({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
    });
  });
});

describe("CORS allow-list", () => {
  it("answers only allow-listed origins, with credentials", async () => {
    env.corsAllowedOrigins.push("https://shop.momento.test");
    try {
      const app = createApp();
      const allowed = await request(app).get("/health").set("Origin", "https://shop.momento.test");
      expect(allowed.headers["access-control-allow-origin"]).toBe("https://shop.momento.test");
      expect(allowed.headers["access-control-allow-credentials"]).toBe("true");
      const blocked = await request(app).get("/health").set("Origin", "https://evil.test");
      expect(blocked.headers["access-control-allow-origin"]).toBeUndefined();
    } finally {
      env.corsAllowedOrigins.pop();
    }
  });
});

describe("input limits and error messages", () => {
  it("rejects oversized bodies with 413 and no internals", async () => {
    const res = await request(testApp())
      .post("/reviews")
      .set(CSRF)
      .send({ comment: "x".repeat(1_200_000) });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: "Payload too large" });
  });

  it("answers malformed JSON with a generic 400", async () => {
    const res = await request(testApp())
      .post("/auth/login")
      .set(CSRF)
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/SyntaxError|stack|node_modules/i);
  });

  it("never leaks stack traces or paths from unexpected errors", async () => {
    const app = testApp();
    const spy = vi.spyOn(mongoose.Model, "find").mockImplementation(() => {
      throw new Error("boom at /secret/path with mongodb://user:pass@host");
    });
    try {
      const res = await request(app).get("/categories");
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "Internal server error" });
    } finally {
      spy.mockRestore();
    }
  });

  it("rejects NoSQL operators in the login body", async () => {
    const res = await anon(testApp())
      .post("/auth/login")
      .send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });

  it("does not sign in with a password of the wrong type", async () => {
    const res = await anon(testApp())
      .post("/auth/login")
      .send({ email: "admin@momento.test", password: [PASSWORD] });
    expect(res.status).toBe(400);
  });

  it("sends the helmet security headers and hides the framework", async () => {
    const res = await request(testApp()).get("/health");
    expect(res.headers["x-powered-by"]).toBeUndefined();
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["strict-transport-security"]).toBeDefined();
    expect(res.headers["content-security-policy"]).toBeDefined();
  });
});

describe("GET /health/ready", () => {
  it("is 200 while MongoDB answers", async () => {
    const res = await request(testApp()).get("/health/ready");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("is 503 when the database is unreachable", async () => {
    const db = mongoose.connection.db!;
    vi.spyOn(db, "admin").mockReturnValue({
      ping: () => Promise.reject(new Error("down")),
    } as unknown as ReturnType<typeof db.admin>);
    try {
      const res = await request(testApp()).get("/health/ready");
      expect(res.status).toBe(503);
      expect(res.body.status).toBe("unavailable");
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe("logging", () => {
  it("removes cookies, IP addresses and personal fields from log lines", () => {
    const lines: string[] = [];
    const log = pino(
      { redact: { paths: LOG_REDACT_PATHS, remove: true } },
      {
        write: (line: string) => void lines.push(line),
      },
    );
    log.info({
      req: {
        remoteAddress: "203.0.113.9",
        headers: { cookie: "momento_at=secret", "x-forwarded-for": "203.0.113.9", host: "api" },
      },
      customer: { phone: "9841234567", address: "Baneshwor", email: "a@b.test" },
    });
    const text = lines.join("");
    for (const secret of ["203.0.113.9", "momento_at", "9841234567", "Baneshwor", "a@b.test"]) {
      expect(text).not.toContain(secret);
    }
    expect(text).toContain('"host":"api"');
  });
});
