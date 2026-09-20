import { slugSchema } from "@momento/shared";
import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("makes lowercase, hyphenated slugs", () => {
    expect(slugify("Classic Lay-Flat Photo Book!")).toBe("classic-lay-flat-photo-book");
    expect(slugify("  Wedding & Album  ")).toBe("wedding-and-album");
    expect(slugify("Café Frame")).toBe("cafe-frame");
  });

  it("gives an empty slug for text with no letters or digits, and never a bad one", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("नेपाली")).toBe("");
    for (const text of ["A  B", "--x--", "x".repeat(300)]) {
      expect(slugSchema.safeParse(slugify(text)).success).toBe(true);
    }
  });
});
