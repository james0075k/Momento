import argon2 from "argon2";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { RefreshTokenModel } from "../models/RefreshToken";
import { UserModel } from "../models/User";
import { anon, cookiesFrom, createUser, CSRF, loginAs, PASSWORD, testApp } from "./helpers";

describe("POST /auth/login", () => {
  it("logs in, sets httpOnly cookies and never returns the password hash", async () => {
    const app = testApp();
    const user = await createUser("admin");

    const res = await anon(app).post("/auth/login").send({ email: user.email, password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: user.email, role: "admin" });
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");

    const cookies = (res.headers["set-cookie"] as unknown as string[]) ?? [];
    expect(cookies).toHaveLength(2);
    for (const cookie of cookies) expect(cookie).toMatch(/HttpOnly/i);
    expect(cookies.find((c) => c.startsWith("momento_rt="))).toMatch(/Path=\/auth/);
  });

  it("stores an argon2id hash, not the password", async () => {
    await createUser("admin");
    const stored = await UserModel.findOne().select("+passwordHash");
    expect(stored?.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await argon2.verify(stored!.passwordHash, PASSWORD)).toBe(true);
  });

  it("gives the same 401 for a wrong password and an unknown email", async () => {
    const app = testApp();
    const user = await createUser("admin");

    const wrongPassword = await anon(app)
      .post("/auth/login")
      .send({ email: user.email, password: "nope-nope-nope" });
    const unknownEmail = await anon(app)
      .post("/auth/login")
      .send({ email: "who@momento.test", password: PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });

  it("rejects malformed bodies with 400", async () => {
    const res = await anon(testApp()).post("/auth/login").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("rate limits repeated failed logins", async () => {
    const app = testApp({ login: 3 });
    const user = await createUser("admin");
    const attempt = () =>
      anon(app).post("/auth/login").send({ email: user.email, password: "wrong-password" });

    for (let i = 0; i < 3; i += 1) expect((await attempt()).status).toBe(401);
    expect((await attempt()).status).toBe(429);
    // Even the right password is blocked while the window is exhausted.
    const blocked = await anon(app)
      .post("/auth/login")
      .send({ email: user.email, password: PASSWORD });
    expect(blocked.status).toBe(429);
  });
});

describe("CSRF header", () => {
  it("rejects state-changing requests without X-Requested-With", async () => {
    const app = testApp();
    const user = await createUser("admin");
    const res = await request(app)
      .post("/auth/login")
      .send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(403);
  });
});

describe("GET /auth/me and roles", () => {
  it("requires a session", async () => {
    const res = await anon(testApp()).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the current user after login", async () => {
    const app = testApp();
    const admin = await loginAs(app, "admin");
    const res = await admin.get("/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(admin.user.email);
  });

  it("only admins can create users; staff get 403, anonymous get 401", async () => {
    const app = testApp();
    const body = {
      name: "New Staff",
      email: "new@momento.test",
      password: "a-long-password-1",
      role: "staff",
    };

    expect((await anon(app).post("/auth/users").send(body)).status).toBe(401);

    const staff = await loginAs(app, "staff");
    expect((await staff.post("/auth/users").send(body)).status).toBe(403);

    const admin = await loginAs(app, "admin");
    const created = await admin.post("/auth/users").send(body);
    expect(created.status).toBe(201);
    expect(created.body.data.role).toBe("staff");
    expect(created.body.data).not.toHaveProperty("passwordHash");
  });

  it("admin-only routes reject staff", async () => {
    const app = testApp();
    const staff = await loginAs(app, "staff");
    expect((await staff.put("/settings").send({})).status).toBe(403);
    expect((await staff.get("/coupons")).status).toBe(403);
  });

  it("rejects a tampered access token", async () => {
    const app = testApp();
    const res = await request(app).get("/auth/me").set("Cookie", "momento_at=not.a.jwt");
    expect(res.status).toBe(401);
  });
});

describe("refresh token rotation", () => {
  async function login(app: ReturnType<typeof testApp>) {
    const user = await createUser("admin");
    const res = await anon(app).post("/auth/login").send({ email: user.email, password: PASSWORD });
    return cookiesFrom(res);
  }

  it("issues a new pair and revokes the old refresh token", async () => {
    const app = testApp();
    const first = await login(app);

    const res = await request(app)
      .post("/auth/refresh")
      .set(CSRF)
      .set("Cookie", `momento_rt=${first["momento_rt"]}`);
    expect(res.status).toBe(204);
    const second = cookiesFrom(res);
    expect(second["momento_rt"]).toBeTruthy();
    expect(second["momento_rt"]).not.toBe(first["momento_rt"]);

    const rows = await RefreshTokenModel.find().sort({ createdAt: 1 });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.revokedAt).toBeTruthy();
    expect(rows[0]?.replacedBy).toBe(rows[1]?.jti);
    expect(rows[1]?.revokedAt).toBeUndefined();

    // The new access token works.
    const me = await request(app)
      .get("/auth/me")
      .set("Cookie", `momento_at=${second["momento_at"]}`);
    expect(me.status).toBe(200);
  });

  it("detects reuse of a rotated token and revokes the whole family", async () => {
    const app = testApp();
    const first = await login(app);

    const rotated = await request(app)
      .post("/auth/refresh")
      .set(CSRF)
      .set("Cookie", `momento_rt=${first["momento_rt"]}`);
    const second = cookiesFrom(rotated);

    // Attacker replays the old token.
    const replay = await request(app)
      .post("/auth/refresh")
      .set(CSRF)
      .set("Cookie", `momento_rt=${first["momento_rt"]}`);
    expect(replay.status).toBe(401);

    // The legitimate newer token is now dead too.
    const afterReplay = await request(app)
      .post("/auth/refresh")
      .set(CSRF)
      .set("Cookie", `momento_rt=${second["momento_rt"]}`);
    expect(afterReplay.status).toBe(401);
    expect(await RefreshTokenModel.countDocuments({ revokedAt: { $exists: false } })).toBe(0);
  });

  it("rejects a missing or garbage refresh token", async () => {
    const app = testApp();
    expect((await anon(app).post("/auth/refresh")).status).toBe(401);
    const bad = await request(app)
      .post("/auth/refresh")
      .set(CSRF)
      .set("Cookie", "momento_rt=garbage");
    expect(bad.status).toBe(401);
  });

  it("logout revokes the refresh token", async () => {
    const app = testApp();
    const first = await login(app);

    const out = await request(app)
      .post("/auth/logout")
      .set(CSRF)
      .set("Cookie", `momento_rt=${first["momento_rt"]}`);
    expect(out.status).toBe(204);

    const after = await request(app)
      .post("/auth/refresh")
      .set(CSRF)
      .set("Cookie", `momento_rt=${first["momento_rt"]}`);
    expect(after.status).toBe(401);
  });
});
