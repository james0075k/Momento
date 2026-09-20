import { afterEach, describe, expect, it, vi } from "vitest";
import { API_COOLDOWN_MS, apiGet, apiLooksDown, resetApiBreaker, tagFor } from "./api";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetApiBreaker();
});

describe("apiGet when the API cannot be reached", () => {
  it("fails once, then answers null at once for a few seconds without calling fetch again", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    vi.stubGlobal("fetch", fetchMock);

    expect(await apiGet("/products")).toBeNull();
    expect(apiLooksDown()).toBe(true);
    expect(await apiGet("/settings")).toBeNull();
    expect(await apiGet("/categories")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Once the cooldown is over it tries again, and recovers when the API is back.
    vi.advanceTimersByTime(API_COOLDOWN_MS + 1);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ data: [] }) });
    expect(await apiGet("/products")).toEqual({ data: [] });
    expect(apiLooksDown()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not treat a 404 or 500 answer as the API being down", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);
    expect(await apiGet("/products/nope")).toBeNull();
    expect(apiLooksDown()).toBe(false);
    expect(await apiGet("/products/other")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("tagFor", () => {
  it("maps an API path to its resource tag", () => {
    expect(tagFor("/products?limit=3")).toBe("products");
    expect(tagFor("/products/abc/also-bought")).toBe("products");
    expect(tagFor("/home-sections")).toBe("home-sections");
    expect(tagFor("/reviews?productId=1")).toBe("reviews");
    expect(tagFor("/settings")).toBe("settings");
    expect(tagFor("/health")).toBeUndefined();
    expect(tagFor("/orders/track")).toBeUndefined();
  });
});
