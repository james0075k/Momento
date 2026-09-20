import { describe, expect, it } from "vitest";
import { reorder } from "./reorder-list";

describe("reorder", () => {
  it("moves an item earlier or later", () => {
    expect(reorder(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(reorder(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });

  it("does nothing at the ends or out of range, and never changes the original", () => {
    const list = ["a", "b", "c"];
    expect(reorder(list, 0, -1)).toEqual(["a", "b", "c"]);
    expect(reorder(list, 2, 1)).toEqual(["a", "b", "c"]);
    expect(reorder(list, 9, -1)).toEqual(["a", "b", "c"]);
    expect(list).toEqual(["a", "b", "c"]);
  });
});
