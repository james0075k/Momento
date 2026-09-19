import { describe, expect, it } from "vitest";
import { currencySchema, healthResponseSchema } from "./common";

describe("common schemas", () => {
  it("accepts NPR as the only currency", () => {
    expect(currencySchema.safeParse("NPR").success).toBe(true);
    expect(currencySchema.safeParse("USD").success).toBe(false);
  });

  it("validates a health response", () => {
    const result = healthResponseSchema.safeParse({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });
});
