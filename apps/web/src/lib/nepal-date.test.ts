import { describe, expect, it } from "vitest";
import { endOfNepalDay, toNepalDay } from "./nepal-date";

describe("Nepal days for date boxes", () => {
  it("ends a chosen day at 23:59:59 Nepal time", () => {
    expect(endOfNepalDay("2026-10-12")).toBe("2026-10-12T18:14:59.000Z");
  });

  it("round-trips: the end of a day is still that day", () => {
    expect(toNepalDay(endOfNepalDay("2026-10-12"))).toBe("2026-10-12");
    expect(toNepalDay(endOfNepalDay("2026-12-31"))).toBe("2026-12-31");
  });

  it("puts late-evening UTC into the next Nepal day", () => {
    expect(toNepalDay("2026-09-19T18:15:00.000Z")).toBe("2026-09-20");
    expect(toNepalDay("2026-09-19T18:14:59.000Z")).toBe("2026-09-19");
  });
});
