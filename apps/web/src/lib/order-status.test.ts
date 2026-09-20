import { orderStatusSchema } from "@momento/shared";
import { describe, expect, it } from "vitest";
import { formatNepalDate, formatNepalDateTime } from "./format";
import { ACTION_LABEL, nextStatuses, STATUS_LABEL, STATUS_TONE } from "./order-status";

describe("order status helpers", () => {
  it("label every status the API knows", () => {
    for (const status of orderStatusSchema.options) {
      expect(STATUS_LABEL[status]).toBeTruthy();
      expect(STATUS_TONE[status]).toBeTruthy();
      expect(ACTION_LABEL[status]).toBeTruthy();
    }
  });

  it("only offer moves the API allows, and none from a finished order", () => {
    expect(nextStatuses("pending_payment")).toContain("paid");
    expect(nextStatuses("pending_payment")).not.toContain("delivered");
    expect(nextStatuses("delivered")).toEqual([]);
    expect(nextStatuses("cancelled")).toEqual([]);
  });
});

describe("Nepal date formatting", () => {
  it("shows Nepal time (UTC+5:45) whatever the browser zone is", () => {
    // 18:30 UTC is 00:15 the next day in Nepal, and must not print as 24:15.
    expect(formatNepalDateTime("2026-09-20T18:30:00Z")).toMatch(/^21 Sep\w* 2026, 00:15$/);
    expect(formatNepalDate("2026-09-20T18:30:00Z")).toMatch(/^21 Sep\w* 2026$/);
  });
});
