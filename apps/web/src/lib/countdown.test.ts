import { describe, expect, it } from "vitest";
import { formatCountdown } from "./countdown";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatCountdown", () => {
  it("is empty once the time has passed", () => {
    expect(formatCountdown(0)).toBe("");
    expect(formatCountdown(-5)).toBe("");
  });

  it("formats days, hours and minutes, singular and plural", () => {
    expect(formatCountdown(30_000)).toBe("under a minute");
    expect(formatCountdown(MIN)).toBe("1 minute");
    expect(formatCountdown(12 * MIN)).toBe("12 minutes");
    expect(formatCountdown(HOUR)).toBe("1 hour");
    expect(formatCountdown(4 * HOUR + 12 * MIN)).toBe("4 hours 12 minutes");
    expect(formatCountdown(DAY)).toBe("1 day");
    expect(formatCountdown(3 * DAY + 4 * HOUR + 59 * MIN)).toBe("3 days 4 hours");
  });
});
