import type { Product } from "@momento/shared";
import { describe, expect, it } from "vitest";
import {
  emptyProductForm,
  formFromProduct,
  toProductInput,
  type ProductFormState,
} from "./product-form";

const id = (n: number) => n.toString(16).padStart(24, "0");

const filled = (over: Partial<ProductFormState> = {}): ProductFormState => ({
  ...emptyProductForm(),
  title: "Wedding Album",
  slug: "wedding-album",
  categoryId: id(9),
  basePrice: "6500",
  ...over,
});

describe("toProductInput", () => {
  it("builds valid input from a filled form", () => {
    const { input, errors } = toProductInput(filled({ shortDescription: "Heirloom" }));
    expect(errors).toEqual({});
    expect(input).toMatchObject({
      title: "Wedding Album",
      basePrice: 6500,
      shortDescription: "Heirloom",
      isActive: true,
      variants: [],
    });
  });

  it("keeps the id of an existing size and leaves new sizes without one", () => {
    const { input } = toProductInput(
      filled({
        variants: [
          { id: id(5), size: "A5", cover: "Softcover", pages: "20", price: "1500" },
          { size: "A4", cover: "", pages: "", price: "2500" },
        ],
      }),
    );
    expect(input?.variants).toEqual([
      { id: id(5), size: "A5", cover: "Softcover", pages: 20, price: 1500 },
      { size: "A4", cover: undefined, pages: undefined, price: 2500 },
    ]);
  });

  it("round-trips a product through the form without losing sizes or their ids", () => {
    const product = {
      id: id(1),
      title: "Book",
      slug: "book",
      categoryId: id(9),
      shortDescription: "",
      description: "<p>x</p>",
      images: ["https://res.cloudinary.com/demo/image/upload/a.jpg"],
      basePrice: 1000,
      variants: [{ id: id(5), size: "A5", cover: "Hard", pages: 20, price: 1500 }],
      highlights: ["Lay flat"],
      occasions: ["wedding"],
      specs: [{ label: "Paper", value: "Matte" }],
      faqs: [],
      isFeatured: true,
      isActive: false,
      createdAt: "",
      updatedAt: "",
    } satisfies Product;
    const { input, errors } = toProductInput(formFromProduct(product));
    expect(errors).toEqual({});
    expect(input?.variants).toEqual([
      { id: id(5), size: "A5", cover: "Hard", pages: 20, price: 1500 },
    ]);
    expect(input).toMatchObject({ isFeatured: true, isActive: false, occasions: ["wedding"] });
  });

  it("drops blank and half-filled rows instead of rejecting them", () => {
    const { input, errors } = toProductInput(
      filled({
        variants: [{ size: "", cover: "", pages: "", price: "" }],
        highlights: ["  ", "Lay flat"],
        specs: [
          { label: "Paper", value: "" },
          { label: "Size", value: "A5" },
        ],
        faqs: [{ question: "Q?", answer: "" }],
      }),
    );
    expect(errors).toEqual({});
    expect(input?.variants).toEqual([]);
    expect(input?.highlights).toEqual(["Lay flat"]);
    expect(input?.specs).toEqual([{ label: "Size", value: "A5" }]);
    expect(input?.faqs).toEqual([]);
  });

  it("explains what is wrong in plain words, per field", () => {
    const { input, errors } = toProductInput(
      filled({
        title: "",
        slug: "Bad Slug",
        categoryId: "",
        basePrice: "12.5",
        variants: [{ size: "A5", cover: "", pages: "x", price: "abc" }],
      }),
    );
    expect(input).toBeUndefined();
    expect(errors["title"]).toBe("This is required.");
    expect(errors["slug"]).toMatch(/lowercase/);
    expect(errors["categoryId"]).toBeDefined();
    expect(errors["basePrice"]).toBe("Enter a whole number of rupees, like 1500.");
    expect(errors["variants.0.price"]).toBe("Enter a whole number of rupees.");
    expect(errors["variants.0.pages"]).toBe("Enter a whole number of pages.");
  });
});
