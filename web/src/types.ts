import type { Timestamp } from "firebase/firestore";

export const categories = [
  "TOP",
  "BOTTOM",
  "DRESS",
  "OUTERWEAR",
  "SHOES",
  "ACCESSORY",
  "OTHER",
] as const;

export const conditions = ["NEW", "VERY_GOOD", "GOOD"] as const;

export const fabrics = [
  "ACRYLIC",
  "COTTON",
  "ELASTANE",
  "HEMP",
  "LINEN",
  "LYOCELL",
  "MIXED",
  "MODAL",
  "POLYAMIDE",
  "POLYESTER",
  "SILK",
  "VISCOSE",
  "WOOL",
  "OTHER",
  "UNKNOWN",
] as const;

export type Category = (typeof categories)[number];
export type Condition = (typeof conditions)[number];
export type Fabric = (typeof fabrics)[number];
export type ItemStatus = "DRAFT" | "AVAILABLE" | "RESERVED" | "EXCHANGED" | "WITHDRAWN" | "DELETED";
export type ExchangeStatus = "REQUESTED" | "ACCEPTED" | "DISPUTED" | "COMPLETED" | "CANCELLED";

export interface ClothingItem {
  id: string;
  ownerId: string;
  ownerDisplayName: string;
  title: string;
  category: Category;
  size: string;
  condition: Condition;
  mainFabric: Fabric;
  description: string;
  compositionText: string;
  imagePaths: string[];
  status: ItemStatus;
  activeExchangeId: string | null;
  publishedAt: Timestamp | null;
  deletedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Exchange {
  id: string;
  itemId: string;
  itemTitle: string;
  contributorId: string;
  claimantId: string;
  status: ExchangeStatus;
  consentFlags: {
    claimantContactDisclosure: boolean;
    contributorContactDisclosure: boolean;
  };
  cancellationReason: string | null;
  disputeReason: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CoinAccount {
  available: number;
  reserved: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CoinEvent {
  id: string;
  kind: "WELCOME_ISSUED" | "HOLD_CREATED" | "HOLD_RELEASED" | "COIN_TRANSFERRED" | "ADMIN_ADJUSTED";
  amount: number;
  affectedUserIds: string[];
  exchangeId: string | null;
  createdAt: Timestamp;
}

export interface UserProfile {
  displayName: string;
  status: "ACTIVE" | "SUSPENDED" | "DEACTIVATED";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ItemInput {
  title: string;
  category: Category;
  size: string;
  condition: Condition;
  mainFabric: Fabric;
  description: string;
  compositionText: string;
  imagePaths: string[];
}

export function humanize(value: string): string {
  return value.toLowerCase().replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}
