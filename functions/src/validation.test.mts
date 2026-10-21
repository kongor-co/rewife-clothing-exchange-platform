import { describe, expect, it } from "vitest";
import { displayNameSchema, itemInputSchema, operationDocumentId, operationIdSchema } from "./validation";

const validItem = {
  title: "Blue linen shirt",
  category: "TOP",
  size: "M",
  condition: "VERY_GOOD",
  mainFabric: "LINEN",
  description: "Clean and ready to pass on.",
  compositionText: "100% linen",
  imagePaths: [],
};

describe("MVP input validation", () => {
  it("accepts a valid garment draft", () => {
    expect(itemInputSchema.parse(validItem).title).toBe("Blue linen shirt");
  });

  it("rejects a brand field", () => {
    expect(() => itemInputSchema.parse({ ...validItem, brand: "Not allowed" })).toThrow();
  });

  it("rejects oversized text", () => {
    expect(() => itemInputSchema.parse({ ...validItem, description: "x".repeat(501) })).toThrow();
  });

  it("accepts only category-appropriate garment sizes", () => {
    expect(itemInputSchema.parse({ ...validItem, category: "SHOES", size: "EU 40.5" }).size).toBe("EU 40.5");
    expect(() => itemInputSchema.parse({ ...validItem, category: "SHOES", size: "M" })).toThrow();
    expect(() => itemInputSchema.parse({ ...validItem, size: "Custom size" })).toThrow();
  });

  it("validates display names", () => {
    expect(displayNameSchema.parse("  Riley  ")).toBe("Riley");
    expect(() => displayNameSchema.parse("x".repeat(51))).toThrow();
  });

  it("accepts UUID operation identifiers", () => {
    const id = "e9cfbe26-66e2-4c28-b679-502981f6702a";
    expect(operationIdSchema.parse(id)).toBe(id);
    expect(operationDocumentId("member", id)).toContain("member_");
  });
});
