import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "./api";
import { adminList, adminRequest, query, refreshSession } from "./admin-api";

const json = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("adminRequest", () => {
  it("sends cookies and the CSRF header, and unwraps { data }", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { data: { id: "1" } }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await adminRequest("/products/1")).toEqual({ id: "1" });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
    expect((init.headers as Record<string, string>)["X-Requested-With"]).toBe("momento");
  });

  it("uses POST for a body, and returns undefined for 204", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204 } as Response);
    vi.stubGlobal("fetch", fetchMock);
    expect(await adminRequest("/products", { body: { title: "x" } })).toBeUndefined();
    expect((fetchMock.mock.calls[0] as [string, RequestInit])[1].method).toBe("POST");
  });

  it("refreshes once and retries when the access cookie has expired", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401, { error: "Authentication required" }))
      .mockResolvedValueOnce(json(204, null)) // POST /auth/refresh
      .mockResolvedValueOnce(json(200, { data: "ok" }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await adminRequest("/orders")).toBe("ok");
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      expect.stringContaining("/orders"),
      expect.stringContaining("/auth/refresh"),
      expect.stringContaining("/orders"),
    ]);
  });

  it("shares one refresh between requests that expire together", async () => {
    let refreshCalls = 0;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/auth/refresh")) {
        refreshCalls += 1;
        return json(204, null);
      }
      // The first attempt of each request fails, every retry succeeds.
      const seen = (fetchMock as unknown as { seen?: Set<string> }).seen ?? new Set<string>();
      (fetchMock as unknown as { seen?: Set<string> }).seen = seen;
      if (!seen.has(url)) {
        seen.add(url);
        return json(401, { error: "Authentication required" });
      }
      return json(200, { data: url });
    });
    vi.stubGlobal("fetch", fetchMock);
    const [a, b] = await Promise.all([adminRequest("/a"), adminRequest("/b")]);
    expect(a).toContain("/a");
    expect(b).toContain("/b");
    expect(refreshCalls).toBe(1);
  });

  it("gives up with a 401 when the refresh fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(401, { error: "Authentication required" }))
      .mockResolvedValueOnce(json(401, { error: "Invalid refresh token" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(adminRequest("/orders")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not try to refresh a failed login", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(401, { error: "Invalid email or password" }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(adminRequest("/auth/login", { body: { email: "a" } })).rejects.toMatchObject({
      message: "Invalid email or password",
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("turns errors into ApiError with the field messages, and network failures into status 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        json(400, {
          error: "Validation failed",
          details: { fieldErrors: { slug: ["Bad slug"] } },
        }),
      ),
    );
    const error = await adminRequest("/products", { body: {} }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fields).toEqual({ slug: ["Bad slug"] });

    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    await expect(adminRequest("/products")).rejects.toMatchObject({ status: 0 });
  });

  it("says something kind for a rate limit", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(429, {})));
    await expect(adminRequest("/auth/login", { body: {} })).rejects.toThrow(/Too many attempts/);
  });
});

describe("adminList and query", () => {
  it("returns data with meta", async () => {
    const page = { data: [{ id: "1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, page)));
    expect(await adminList("/products")).toEqual(page);
  });

  it("builds a query string without empty values", () => {
    expect(query({ page: 2, q: "", status: undefined, active: false })).toBe(
      "?page=2&active=false",
    );
    expect(query({})).toBe("");
  });
});

describe("refreshSession", () => {
  it("is false when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect(await refreshSession()).toBe(false);
  });
});
