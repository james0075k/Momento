import { describe, expect, it } from "vitest";
import { emptyServiceForm, toServiceInput } from "./service-form";

describe("toServiceInput", () => {
  it("builds a service, with the image, price and home flag", () => {
    const { input, errors } = toServiceInput({
      ...emptyServiceForm(),
      title: "Photo Restoration",
      slug: "photo-restoration",
      description: "<p>We repair old photos.</p>",
      images: ["https://res.cloudinary.com/demo/image/upload/a.jpg"],
      startingPrice: "500",
      showOnHome: true,
      order: "2",
    });
    expect(errors).toEqual({});
    expect(input).toMatchObject({
      title: "Photo Restoration",
      image: "https://res.cloudinary.com/demo/image/upload/a.jpg",
      startingPrice: 500,
      showOnHome: true,
      order: 2,
      isActive: true,
    });
  });

  it("allows no price and no image", () => {
    const { input } = toServiceInput({
      ...emptyServiceForm(),
      title: "Design help",
      slug: "design-help",
    });
    expect(input?.startingPrice).toBeUndefined();
    expect(input?.image).toBeUndefined();
  });

  it("says what is wrong in plain words", () => {
    const { input, errors } = toServiceInput({
      ...emptyServiceForm(),
      title: "",
      slug: "Bad Slug",
      startingPrice: "abc",
      order: "x",
    });
    expect(input).toBeUndefined();
    expect(errors["title"]).toBe("This is required.");
    expect(errors["slug"]).toBeDefined();
    expect(errors["startingPrice"]).toMatch(/whole number/);
    expect(errors["order"]).toMatch(/whole number/);
  });
});
