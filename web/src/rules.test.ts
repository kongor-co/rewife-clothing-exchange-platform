import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, query, setDoc, Timestamp, updateDoc, where } from "firebase/firestore";

let environment: RulesTestEnvironment;

const now = Timestamp.now();
const profile = { displayName: "Test member", status: "ACTIVE", createdAt: now, updatedAt: now };
const item = {
  ownerId: "owner",
  ownerDisplayName: "Owner",
  title: "Blue linen shirt",
  category: "TOP",
  size: "M",
  condition: "VERY_GOOD",
  mainFabric: "LINEN",
  description: "Ready to pass on",
  compositionText: "100% linen",
  imagePaths: ["itemImages/owner/item-1/photo.webp"],
  status: "AVAILABLE",
  activeExchangeId: null,
  publishedAt: now,
  createdAt: now,
  updatedAt: now,
};

beforeAll(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-rewife",
    firestore: {
      rules: readFileSync(resolve(process.cwd(), "..", "firestore.rules"), "utf8"),
    },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await Promise.all([
      setDoc(doc(database, "users", "owner"), profile),
      setDoc(doc(database, "users", "claimant"), { ...profile, displayName: "Claimant" }),
      setDoc(doc(database, "users", "unrelated"), { ...profile, displayName: "Unrelated" }),
      setDoc(doc(database, "coinAccounts", "owner"), { available: 10, reserved: 0, createdAt: now, updatedAt: now }),
      setDoc(doc(database, "clothingItems", "item-1"), item),
      setDoc(doc(database, "exchanges", "exchange-1"), {
        itemId: "item-1",
        itemTitle: item.title,
        contributorId: "owner",
        claimantId: "claimant",
        status: "ACCEPTED",
        consentFlags: { claimantContactDisclosure: true, contributorContactDisclosure: true },
        cancellationReason: null,
        disputeReason: null,
        resolutionReason: null,
        createdAt: now,
        updatedAt: now,
      }),
    ]);
  });
});

afterAll(async () => {
  await environment.cleanup();
});

function verifiedDatabase(uid: string) {
  return environment.authenticatedContext(uid, { email_verified: true }).firestore();
}

describe("Firestore access boundaries", () => {
  it("denies anonymous catalog access", async () => {
    const database = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(database, "clothingItems", "item-1")));
  });

  it("allows active verified members to query available garments", async () => {
    const database = verifiedDatabase("claimant");
    const available = query(collection(database, "clothingItems"), where("status", "==", "AVAILABLE"));
    await assertSucceeds(getDocs(available));
  });

  it("allows only the owner to read a coin account", async () => {
    await assertSucceeds(getDoc(doc(verifiedDatabase("owner"), "coinAccounts", "owner")));
    await assertFails(getDoc(doc(verifiedDatabase("claimant"), "coinAccounts", "owner")));
  });

  it("allows exchange participants and rejects unrelated members", async () => {
    await assertSucceeds(getDoc(doc(verifiedDatabase("owner"), "exchanges", "exchange-1")));
    await assertSucceeds(getDoc(doc(verifiedDatabase("claimant"), "exchanges", "exchange-1")));
    await assertFails(getDoc(doc(verifiedDatabase("unrelated"), "exchanges", "exchange-1")));
  });

  it("denies every browser write", async () => {
    const database = verifiedDatabase("owner");
    await assertFails(updateDoc(doc(database, "coinAccounts", "owner"), { available: 999 }));
    await assertFails(updateDoc(doc(database, "clothingItems", "item-1"), { status: "EXCHANGED" }));
  });
});
