import { describe, expect, it } from "vitest";
import { humanize } from "./types";

describe("display helpers", () => {
  it("turns enum values into readable labels", () => {
    expect(humanize("VERY_GOOD")).toBe("Very good");
    expect(humanize("OUTERWEAR")).toBe("Outerwear");
  });
});
