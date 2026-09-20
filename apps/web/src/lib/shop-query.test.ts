import { describe, expect, it } from "vitest";
import { parseShopQuery, shopApiPath, shopSearch } from "./shop-query";

describe("shop query", () => {
  it("drops malformed values instead of failing", () => {
    expect(
      parseShopQuery({ category: "../x", occasion: "nope", sort: "evil", page: "-3", q: "  " }),
    ).toEqual({ category: undefined, occasion: undefined, q: undefined, sort: "newest", page: 1 });
  });

  it("round-trips through the URL and the API path", () => {
    const query = parseShopQuery({
      category: "photo-books",
      occasion: "wedding",
      q: "album",
      sort: "price_asc",
      page: "2",
    });
    expect(shopSearch(query)).toBe(
      "?category=photo-books&occasion=wedding&q=album&sort=price_asc&page=2",
    );
    expect(shopApiPath(query)).toContain("occasion=wedding");
    expect(shopSearch({ sort: "newest", page: 1 })).toBe("");
  });
});
