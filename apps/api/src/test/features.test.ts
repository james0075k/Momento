import { FEATURE_KEYS, isFeatureOn, resolveFeatures } from "@momento/shared";
import express from "express";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../config/env";
import { requireFeature } from "../middleware/feature";
import { SettingsModel } from "../models";
import { revalidateWeb } from "../services/revalidate";
import { anon, loginAs, testApp } from "./helpers";

const BASE_SETTINGS = {
  shopWhatsappNumber: "9779801234567",
  deliveryFees: { insideValley: 100, outsideValley: 250 },
  socialLinks: {},
  paymentDetails: {},
  seo: {},
};

describe("feature flags in settings", () => {
  it("are all off by default and every key is present", async () => {
    const res = await anon(testApp()).get("/settings");
    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data.features).sort()).toEqual([...FEATURE_KEYS].sort());
    expect(Object.values(res.body.data.features).every((value) => value === false)).toBe(true);
  });

  it("only admins change them, and an update that names some flags leaves the others alone", async () => {
    const app = testApp();
    const staff = await loginAs(app, "staff");
    expect(
      (await staff.put("/settings").send({ ...BASE_SETTINGS, features: { wishlist: true } }))
        .status,
    ).toBe(403);

    const admin = await loginAs(app, "admin");
    await admin
      .put("/settings")
      .send({ ...BASE_SETTINGS, features: { wishlist: true, share: true } });
    // A later update that says nothing about features must not switch anything off.
    await admin.put("/settings").send({ ...BASE_SETTINGS, shopWhatsappNumber: "9779800000001" });
    await admin.put("/settings").send({ ...BASE_SETTINGS, features: { share: false } });

    const { features } = (await anon(app).get("/settings")).body.data;
    expect(features.wishlist).toBe(true);
    expect(features.share).toBe(false);
    expect(features.giftCards).toBe(false);
  });

  it("rejects unknown flag values", async () => {
    const admin = await loginAs(testApp(), "admin");
    const res = await admin
      .put("/settings")
      .send({ ...BASE_SETTINGS, features: { wishlist: "yes" } });
    expect(res.status).toBe(400);
  });

  it("treats a settings document saved before flags existed as all off", async () => {
    const app = testApp();
    await anon(app).get("/settings"); // creates the document
    await SettingsModel.collection.updateOne({ key: "main" }, { $unset: { features: "" } });
    const res = await anon(app).get("/settings");
    expect(res.body.data.features.wishlist).toBe(false);
  });
});

describe("helpers", () => {
  it("resolveFeatures and isFeatureOn read missing flags as off", () => {
    expect(resolveFeatures(undefined).wishlist).toBe(false);
    expect(resolveFeatures({ wishlist: true }).wishlist).toBe(true);
    expect(isFeatureOn(undefined, "wishlist")).toBe(false);
    expect(isFeatureOn({}, "wishlist")).toBe(false);
    expect(isFeatureOn({ features: { wishlist: true } }, "wishlist")).toBe(true);
  });
});

describe("requireFeature guard", () => {
  const guarded = () => {
    const app = express();
    app.get("/guarded", requireFeature("wishlist"), (_req, res) => res.json({ ok: true }));
    return app;
  };

  it("answers 404 like an unknown route while the flag is off, and passes once it is on", async () => {
    const app = testApp();
    const admin = await loginAs(app, "admin");

    const off = await request(guarded()).get("/guarded");
    expect(off.status).toBe(404);
    expect(off.body).toEqual({ error: "Not found" });

    await admin.put("/settings").send({ ...BASE_SETTINGS, features: { wishlist: true } });
    expect((await request(guarded()).get("/guarded")).status).toBe(200);

    await admin.put("/settings").send({ ...BASE_SETTINGS, features: { wishlist: false } });
    expect((await request(guarded()).get("/guarded")).status).toBe(404);
  });
});

describe("web revalidation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete env.WEB_REVALIDATE_URL;
    delete env.REVALIDATE_SECRET;
  });

  it("does nothing unless both settings are configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await revalidateWeb("settings");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the tag with the secret when a settings update is saved", async () => {
    env.WEB_REVALIDATE_URL = "https://web.example/api/revalidate";
    env.REVALIDATE_SECRET = "a-long-shared-secret-value";
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const admin = await loginAs(testApp(), "admin");
    await admin.put("/settings").send({ ...BASE_SETTINGS, features: { wishlist: true } });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://web.example/api/revalidate");
    expect((init.headers as Record<string, string>)["x-revalidate-secret"]).toBe(
      "a-long-shared-secret-value",
    );
    expect(JSON.parse(init.body as string)).toEqual({ tag: "settings" });
  });

  it("never fails the request when the web app is down", async () => {
    env.WEB_REVALIDATE_URL = "https://web.example/api/revalidate";
    env.REVALIDATE_SECRET = "a-long-shared-secret-value";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    const admin = await loginAs(testApp(), "admin");
    const res = await admin.put("/settings").send(BASE_SETTINGS);
    expect(res.status).toBe(200);
  });
});
