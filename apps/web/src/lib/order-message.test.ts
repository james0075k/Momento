import { describe, expect, it } from "vitest";
import { buildOrderMessage } from "./order-message";
import { whatsappLink } from "./whatsapp";

describe("buildOrderMessage", () => {
  const order = {
    code: "MOM-2026-0007",
    customerName: "Sita Sharma",
    total: 5100,
    photoCount: 12,
    items: [{ title: "Photo Book", variantLabel: "A4, Hardcover", quantity: 2, lineTotal: 5000 }],
  };

  it("includes the code, name, items and total", () => {
    const text = buildOrderMessage(order);
    expect(text).toContain("MOM-2026-0007");
    expect(text).toContain("Sita Sharma");
    expect(text).toContain("2 x Photo Book (A4, Hardcover): NPR 5,000");
    expect(text).toContain("Total: NPR 5,100");
    expect(text).toContain("Photos uploaded: 12");
  });

  it("survives a wa.me round trip without losing characters", () => {
    const url = whatsappLink("+977 98-0000 0000", buildOrderMessage(order));
    expect(url.startsWith("https://wa.me/977980000000")).toBe(true);
    expect(new URL(url).searchParams.get("text")).toBe(buildOrderMessage(order));
  });
});
