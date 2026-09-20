import { describe, expect, it } from "vitest";
import { estimateTotals, estimateWithPromos } from "./pricing";

const fees = { insideValley: 100, outsideValley: 250, freeDeliveryThreshold: 5000 };

// These cases use the same rules as the API's order pricing tests, so the preview cannot drift.
describe("estimateTotals", () => {
  it("adds the valley fee below the free-delivery threshold", () => {
    expect(estimateTotals(2500, "inside_valley", fees)).toEqual({
      subtotal: 2500,
      discount: 0,
      deliveryFee: 100,
      total: 2600,
    });
    expect(estimateTotals(2500, "outside_valley", fees).deliveryFee).toBe(250);
  });

  it("waives delivery at the threshold", () => {
    expect(estimateTotals(5000, "outside_valley", fees).deliveryFee).toBe(0);
  });

  it("caps the discount at the subtotal and never charges delivery on an empty cart", () => {
    expect(estimateTotals(1000, "inside_valley", fees, 5000).total).toBe(100);
    expect(estimateTotals(0, "inside_valley", fees).total).toBe(0);
  });
});

describe("estimateWithPromos", () => {
  it("matches estimateTotals without a referral or gift card", () => {
    expect(estimateWithPromos(2500, "inside_valley", fees)).toMatchObject({
      total: 2600,
      referralDiscount: 0,
      giftCardApplied: 0,
    });
  });

  it("takes the referral after the coupon, and never below zero", () => {
    expect(
      estimateWithPromos(500, "inside_valley", fees, {
        couponDiscount: 450,
        referralDiscount: 100,
      }),
    ).toMatchObject({ discount: 450, referralDiscount: 50, total: 100 });
  });

  it("lets a gift card pay delivery and stops at what is owed", () => {
    expect(estimateWithPromos(250, "inside_valley", fees, { giftCardBalance: 1000 })).toMatchObject(
      {
        giftCardApplied: 350,
        total: 0,
      },
    );
    expect(estimateWithPromos(250, "inside_valley", fees, { giftCardBalance: 100 })).toMatchObject({
      giftCardApplied: 100,
      total: 250,
    });
  });
});
