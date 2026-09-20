import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps admin paths", () => {
    expect(safeNext("/admin")).toBe("/admin");
    expect(safeNext("/admin/orders?status=paid")).toBe("/admin/orders?status=paid");
  });

  it("falls back to the dashboard for anything else", () => {
    for (const value of [
      null,
      undefined,
      "",
      "https://evil.example",
      "//evil.example",
      "/shop",
      "/administrator",
      "/admin/login",
      "/admin\\evil",
      "javascript:alert(1)",
    ]) {
      expect(safeNext(value), String(value)).toBe("/admin");
    }
  });
});
