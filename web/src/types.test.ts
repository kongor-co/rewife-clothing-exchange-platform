import { describe, expect, it } from "vitest";
import {
  filterSizeOptions,
  filterSizeOptionsForCategories,
  isAllowedGarmentSize,
  sizeOptionsByCategory,
  sizeOptionsForCategories,
} from "./garmentOptions";
import { humanize } from "./types";

describe("display helpers", () => {
  it("turns enum values into readable labels", () => {
    expect(humanize("VERY_GOOD")).toBe("Very good");
    expect(humanize("OUTERWEAR")).toBe("Outerwear");
  });
});

describe("garment size options", () => {
  it("filters options by contained text without case sensitivity", () => {
    expect(filterSizeOptions("TOP", "4")).toEqual(expect.arrayContaining(["4XL", "EU 34", "EU 40", "EU 64"]));
    expect(filterSizeOptions("TOP", "s")).toEqual(expect.arrayContaining(["XXS", "XS", "S", "One size"]));
  });

  it("keeps sizes relevant to the selected category", () => {
    expect(sizeOptionsByCategory.SHOES).toContain("EU 40.5");
    expect(isAllowedGarmentSize("SHOES", "EU 40.5")).toBe(true);
    expect(isAllowedGarmentSize("SHOES", "M")).toBe(false);
  });

  it("combines size options for multi-category browse filters", () => {
    expect(sizeOptionsForCategories(["TOP", "SHOES"])).toEqual(expect.arrayContaining(["M", "EU 40.5"]));
    expect(sizeOptionsForCategories(["SHOES"])).not.toContain("M");
  });

  it("searches the browse size list with the add garment matching logic", () => {
    const matches = filterSizeOptionsForCategories([], "4");
    expect(matches).toEqual(expect.arrayContaining(["4XL", "EU 34", "EU 40.5", "EU 64"]));
    expect(matches.every((option) => option.toLocaleLowerCase().includes("4"))).toBe(true);
  });
});
