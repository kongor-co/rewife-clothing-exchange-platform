import { describe, expect, it } from "vitest";
import {
  filterSizeOptions,
  filterSizeOptionsForCategories,
  isAllowedGarmentSize,
  sizeOptionsByCategory,
  sizeOptionsForCategories,
} from "./garmentOptions";
import { humanize } from "./types";
import { exchangeActivityLabel, isActionableExchange } from "./lib/exchangeActivity";
import { verificationContinueUrl } from "./lib/emailVerification";
import {
  exchangeHasContactAccess,
  exchangeMatchesFilters,
  exchangeStatusLabel,
} from "./lib/exchangePresentation";
import { authPath, returnPathFromSearch, safeInternalPath } from "./lib/navigation";
import type { Exchange } from "./types";

const exchangeFixture = {
  id: "exchange-1",
  itemId: "item-1",
  itemTitle: "Linen shirt",
  contributorId: "contributor",
  claimantId: "claimant",
  status: "REQUESTED",
  consentFlags: {
    claimantContactDisclosure: true,
    contributorContactDisclosure: false,
  },
  cancellationReason: null,
  disputeReason: null,
  createdAt: { toMillis: () => 1 },
  updatedAt: { toMillis: () => 2 },
} as Exchange;

describe("display helpers", () => {
  it("turns enum values into readable labels", () => {
    expect(humanize("VERY_GOOD")).toBe("Very good");
    expect(humanize("OUTERWEAR")).toBe("Outerwear");
  });
});

describe("exchange activity", () => {
  it("marks only role-specific actions as actionable", () => {
    expect(isActionableExchange("REQUESTED", "contributor")).toBe(true);
    expect(isActionableExchange("REQUESTED", "claimant")).toBe(false);
    expect(isActionableExchange("ACCEPTED", "claimant")).toBe(true);
    expect(isActionableExchange("ACCEPTED", "contributor")).toBe(false);
    expect(isActionableExchange("DISPUTED", "claimant")).toBe(false);
  });

  it("provides an accessible singular or plural label", () => {
    expect(exchangeActivityLabel(1)).toBe("1 exchange needs your action");
    expect(exchangeActivityLabel(3)).toBe("3 exchanges need your action");
  });
});

describe("exchange presentation", () => {
  it("separates incoming requests from my requests", () => {
    expect(exchangeMatchesFilters(exchangeFixture, "claimant", "OUTGOING", "ALL")).toBe(true);
    expect(exchangeMatchesFilters(exchangeFixture, "claimant", "INCOMING", "ALL")).toBe(false);
    expect(exchangeMatchesFilters(exchangeFixture, "contributor", "INCOMING", "REQUESTED")).toBe(true);
  });

  it("distinguishes rejected, confirmed, and completed views", () => {
    const rejected = { ...exchangeFixture, status: "CANCELLED", cancellationReason: "CONTRIBUTOR_REJECTED" } as Exchange;
    const completed = { ...exchangeFixture, status: "COMPLETED" } as Exchange;
    expect(exchangeMatchesFilters(rejected, "claimant", "ALL", "REJECTED")).toBe(true);
    expect(exchangeMatchesFilters(completed, "claimant", "ALL", "CONFIRMED")).toBe(true);
    expect(exchangeMatchesFilters(completed, "claimant", "ALL", "COMPLETED")).toBe(false);
    expect(exchangeMatchesFilters(completed, "contributor", "ALL", "COMPLETED")).toBe(true);
    expect(exchangeStatusLabel(completed, "claimant")).toBe("Confirmed received");
  });

  it("reveals contact information only after acceptance", () => {
    const accepted = { ...exchangeFixture, status: "ACCEPTED" } as Exchange;
    expect(exchangeHasContactAccess(exchangeFixture)).toBe(false);
    expect(exchangeHasContactAccess(accepted)).toBe(true);
  });
});

describe("account return paths", () => {
  it("keeps internal destinations through account creation", () => {
    expect(authPath("signup", "/items/item-1")).toBe("/auth/signup?from=%2Fitems%2Fitem-1");
    expect(returnPathFromSearch("?from=%2Fitems%2Fitem-1")).toBe("/items/item-1");
  });

  it("returns email verification to Browse", () => {
    expect(verificationContinueUrl("https://ordinal-bucksaw-512007-p8.web.app")).toBe(
      "https://ordinal-bucksaw-512007-p8.web.app/browse?verification=complete",
    );
  });

  it("rejects external and protocol-relative return paths", () => {
    expect(safeInternalPath("https://example.com")).toBe("/browse");
    expect(safeInternalPath("//example.com")).toBe("/browse");
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
