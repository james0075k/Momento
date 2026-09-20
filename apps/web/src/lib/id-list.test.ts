import { describe, expect, it } from "vitest";
import { parseIdList, pushRecent, toggleId } from "./id-list";

const id = (n: number) => n.toString(16).padStart(24, "0");

describe("parseIdList", () => {
  it("keeps valid unique ids and drops everything else", () => {
    const raw = JSON.stringify([id(1), id(1), "nope", 5, null, id(2)]);
    expect(parseIdList(raw, 10)).toEqual([id(1), id(2)]);
  });

  it("returns an empty list for missing, broken or non-array data", () => {
    expect(parseIdList(null, 10)).toEqual([]);
    expect(parseIdList("{not json", 10)).toEqual([]);
    expect(parseIdList('{"a":1}', 10)).toEqual([]);
  });

  it("caps the length", () => {
    const raw = JSON.stringify([id(1), id(2), id(3)]);
    expect(parseIdList(raw, 2)).toEqual([id(1), id(2)]);
  });
});

describe("toggleId", () => {
  it("adds to the front and removes when already present", () => {
    expect(toggleId([id(1)], id(2), 5)).toEqual([id(2), id(1)]);
    expect(toggleId([id(2), id(1)], id(2), 5)).toEqual([id(1)]);
  });

  it("drops the oldest when full", () => {
    expect(toggleId([id(1), id(2)], id(3), 2)).toEqual([id(3), id(1)]);
  });
});

describe("pushRecent", () => {
  it("moves a repeat visit to the front without duplicating it", () => {
    expect(pushRecent([id(1), id(2), id(3)], id(3), 8)).toEqual([id(3), id(1), id(2)]);
  });

  it("keeps only the newest few", () => {
    expect(pushRecent([id(1), id(2)], id(3), 2)).toEqual([id(3), id(1)]);
  });
});
