import { describe, expect, it } from "vitest";
import { orderByRefs, prioritizeByRefs } from "./home";

const items = ["a", "b", "c", "d"].map((id) => ({ id }));
const ids = (list: Array<{ id: string }>) => list.map((item) => item.id);

describe("orderByRefs (products and reviews)", () => {
  it("shows only what is named, in that order, and everything when nothing is named", () => {
    expect(ids(orderByRefs(items, ["c", "a"]))).toEqual(["c", "a"]);
    expect(ids(orderByRefs(items, []))).toEqual(["a", "b", "c", "d"]);
  });
});

describe("prioritizeByRefs (services)", () => {
  it("puts named services first and keeps the rest, so a new service still shows", () => {
    expect(ids(prioritizeByRefs(items, ["c", "a"]))).toEqual(["c", "a", "b", "d"]);
  });

  it("ignores names that are no longer in the list, and changes nothing without any", () => {
    expect(ids(prioritizeByRefs(items, ["gone", "b"]))).toEqual(["b", "a", "c", "d"]);
    expect(ids(prioritizeByRefs(items, []))).toEqual(["a", "b", "c", "d"]);
  });
});
