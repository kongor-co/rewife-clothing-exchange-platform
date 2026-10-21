import { describe, expect, it } from "vitest";
import { filterSizeOptions, isAllowedGarmentSize, sizeOptionsByCategory } from "./garmentOptions";
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
});
