import type { Product, Service } from "@momento/shared";
import { describe, expect, it } from "vitest";
import {
  ANSWER_MAX_WORDS,
  ANSWER_MIN_WORDS,
  countWords,
  productAnswer,
  serviceAnswer,
} from "./answers";

const product = (over: Partial<Product>): Product => ({
  id: "a".repeat(24),
  title: "Classic Lay-Flat Photo Book",
  slug: "classic-lay-flat-photo-book",
  categoryId: "b".repeat(24),
  shortDescription: "A lay-flat hardcover album for your best moments.",
  description: "",
  images: [],
  basePrice: 1800,
  variants: [],
  highlights: [],
  occasions: [],
  specs: [],
  faqs: [],
  isFeatured: false,
  isActive: true,
  createdAt: "",
  updatedAt: "",
  ...over,
});

const inWindow = (text: string) => {
  const words = countWords(text);
  expect(words).toBeGreaterThanOrEqual(ANSWER_MIN_WORDS);
  expect(words).toBeLessThanOrEqual(ANSWER_MAX_WORDS);
};

describe("answer capsules", () => {
  it("keeps product answers between 40 and 60 words", () => {
    inWindow(productAnswer(product({}), "Photo books"));
    inWindow(productAnswer(product({ shortDescription: "" })));
    inWindow(
      productAnswer(
        product({
          shortDescription: "word ".repeat(200),
          variants: [
            { id: "c".repeat(24), size: "A4", price: 1500 },
            { id: "d".repeat(24), size: "A3", price: 2500 },
          ],
        }),
        "Photo books",
      ),
    );
  });

  it("quotes the lowest variant price in NPR", () => {
    const text = productAnswer(
      product({
        variants: [
          { id: "c".repeat(24), size: "A4", price: 2500 },
          { id: "d".repeat(24), size: "A5", price: 1500 },
        ],
      }),
    );
    expect(text).toContain("NPR 1,500");
  });

  it("keeps service answers between 40 and 60 words", () => {
    const service: Service = {
      id: "e".repeat(24),
      title: "Photo restoration",
      slug: "photo-restoration",
      description: "<p>We repair torn, faded and stained family photographs.</p>",
      showOnHome: false,
      order: 0,
      isActive: true,
      startingPrice: 500,
      createdAt: "",
      updatedAt: "",
    };
    inWindow(serviceAnswer(service));
    inWindow(serviceAnswer({ ...service, startingPrice: undefined, description: "" }));
  });
});
