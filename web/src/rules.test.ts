import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, Timestamp, updateDoc, where } from "firebase/firestore";

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
    storage: {
      rules: readFileSync(resolve(process.cwd(), "..", "storage.rules"), "utf8"),
    },
  });
});

beforeEach(async () => {
  await environment.clearFirestore();
  await environment.clearStorage();
  await environment.withSecurityRulesDisabled(async (context) => {
    const database = context.firestore();
    await Promise.all([
      setDoc(doc(database, "users", "owner"), profile),
      setDoc(doc(database, "users", "claimant"), { ...profile, displayName: "Claimant" }),
      setDoc(doc(database, "users", "unrelated"), { ...profile, displayName: "Unrelated" }),
      setDoc(doc(database, "coinAccounts", "owner"), { available: 10, reserved: 0, createdAt: now, updatedAt: now }),
      setDoc(doc(database, "clothingItems", "item-1"), item),
      setDoc(doc(database, "clothingItems", "draft-1"), { ...item, status: "DRAFT", publishedAt: null }),
      setDoc(doc(database, "clothingItems", "reserved-1"), {
        ...item,
        imagePaths: ["itemImages/owner/reserved-1/photo.webp"],
        status: "RESERVED",
        activeExchangeId: "exchange-1",
      }),
      setDoc(doc(database, "clothingItems", "transferred-1"), {
        ...item,
        ownerId: "claimant",
        ownerDisplayName: "Claimant",
        imagePaths: ["itemImages/owner/transferred-1/photo.webp"],
        status: "DRAFT",
        activeExchangeId: null,
        previousExchangeId: "exchange-2",
        publishedAt: null,
      }),
      setDoc(doc(database, "exchanges", "exchange-1"), {
        itemId: "reserved-1",
        itemTitle: item.title,
        itemSize: item.size,
        itemMainFabric: item.mainFabric,
        itemImagePath: "itemImages/owner/reserved-1/photo.webp",
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
      setDoc(doc(database, "exchanges", "exchange-2"), {
        itemId: "transferred-1",
        itemTitle: item.title,
        itemSize: item.size,
        itemMainFabric: item.mainFabric,
        itemImagePath: "itemImages/owner/transferred-1/photo.webp",
        contributorId: "owner",
        claimantId: "claimant",
        status: "COMPLETED",
        consentFlags: { claimantContactDisclosure: true, contributorContactDisclosure: true },
        cancellationReason: null,
        disputeReason: null,
        resolutionReason: null,
        createdAt: now,
        updatedAt: now,
      }),
    ]);
    const storage = context.storage();
    await Promise.all([
      storage.ref("itemImages/owner/item-1/photo.webp").put(new Uint8Array([1]), { contentType: "image/webp" }),
      storage.ref("itemImages/owner/draft-1/photo.webp").put(new Uint8Array([1]), { contentType: "image/webp" }),
      storage.ref("itemImages/owner/reserved-1/photo.webp").put(new Uint8Array([1]), { contentType: "image/webp" }),
      storage.ref("itemImages/owner/transferred-1/photo.webp").put(new Uint8Array([1]), { contentType: "image/webp" }),
    ]);
  });
});

afterAll(async () => {
  await environment.cleanup();
});

function verifiedDatabase(uid: string) {
  return environment.authenticatedContext(uid, { email_verified: true }).firestore();
}

function verifiedStorage(uid: string) {
  return environment.authenticatedContext(uid, { email_verified: true }).storage();
}

describe("Firestore access boundaries", () => {
  it("allows anonymous access to available garments", async () => {
    const database = environment.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(database, "clothingItems", "item-1")));
    const available = query(collection(database, "clothingItems"), where("status", "==", "AVAILABLE"));
    await assertSucceeds(getDocs(available));
  });

  it("keeps non-public garments private from anonymous visitors", async () => {
    const database = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(database, "clothingItems", "draft-1")));
    await assertFails(getDocs(collection(database, "clothingItems")));
  });

  it("keeps member records private from anonymous visitors", async () => {
    const database = environment.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(database, "users", "owner")));
    await assertFails(getDoc(doc(database, "coinAccounts", "owner")));
    await assertFails(getDoc(doc(database, "exchanges", "exchange-1")));
  });

  it("allows active verified members to query available garments", async () => {
    const database = verifiedDatabase("claimant");
    const available = query(collection(database, "clothingItems"), where("status", "==", "AVAILABLE"));
    await assertSucceeds(getDocs(available));
  });

  it("allows an active verified owner to query every garment in their wardrobe", async () => {
    const database = verifiedDatabase("owner");
    const wardrobe = query(
      collection(database, "clothingItems"),
      where("ownerId", "==", "owner"),
      orderBy("updatedAt", "desc"),
    );
    await assertSucceeds(getDocs(wardrobe));
  });

  it("prevents another member from querying somebody else's wardrobe", async () => {
    const database = verifiedDatabase("claimant");
    const wardrobe = query(
      collection(database, "clothingItems"),
      where("ownerId", "==", "owner"),
      orderBy("updatedAt", "desc"),
    );
    await assertFails(getDocs(wardrobe));
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

  it("allows only exchange participants to identify a reserved garment", async () => {
    await assertSucceeds(getDoc(doc(verifiedDatabase("owner"), "clothingItems", "reserved-1")));
    await assertSucceeds(getDoc(doc(verifiedDatabase("claimant"), "clothingItems", "reserved-1")));
    await assertFails(getDoc(doc(verifiedDatabase("unrelated"), "clothingItems", "reserved-1")));

    await assertSucceeds(verifiedStorage("owner").ref("itemImages/owner/reserved-1/photo.webp").getMetadata());
    await assertSucceeds(verifiedStorage("claimant").ref("itemImages/owner/reserved-1/photo.webp").getMetadata());
    await assertFails(verifiedStorage("unrelated").ref("itemImages/owner/reserved-1/photo.webp").getMetadata());
  });

  it("keeps a transferred draft visible to its new owner and completed exchange participants", async () => {
    await assertSucceeds(getDoc(doc(verifiedDatabase("claimant"), "clothingItems", "transferred-1")));
    await assertSucceeds(getDoc(doc(verifiedDatabase("owner"), "clothingItems", "transferred-1")));
    await assertFails(getDoc(doc(verifiedDatabase("unrelated"), "clothingItems", "transferred-1")));

    const formerOwnerWardrobe = query(
      collection(verifiedDatabase("owner"), "clothingItems"),
      where("ownerId", "==", "owner"),
      orderBy("updatedAt", "desc"),
    );
    const receiverWardrobe = query(
      collection(verifiedDatabase("claimant"), "clothingItems"),
      where("ownerId", "==", "claimant"),
      orderBy("updatedAt", "desc"),
    );
    const formerOwnerResults = await assertSucceeds(getDocs(formerOwnerWardrobe));
    const receiverResults = await assertSucceeds(getDocs(receiverWardrobe));
    expect(formerOwnerResults.docs.some((snapshot) => snapshot.id === "transferred-1")).toBe(false);
    expect(receiverResults.docs.some((snapshot) => snapshot.id === "transferred-1")).toBe(true);

    const imagePath = "itemImages/owner/transferred-1/photo.webp";
    await assertSucceeds(verifiedStorage("claimant").ref(imagePath).getMetadata());
    await assertSucceeds(verifiedStorage("owner").ref(imagePath).getMetadata());
    await assertFails(verifiedStorage("unrelated").ref(imagePath).getMetadata());
    await assertFails(environment.unauthenticatedContext().storage().ref(imagePath).getMetadata());
  });

  it("allows the activity indicator queries only for the matching participant", async () => {
    const ownerIncoming = query(
      collection(verifiedDatabase("owner"), "exchanges"),
      where("contributorId", "==", "owner"),
      where("status", "==", "REQUESTED"),
    );
    const claimantOutgoing = query(
      collection(verifiedDatabase("claimant"), "exchanges"),
      where("claimantId", "==", "claimant"),
      where("status", "==", "ACCEPTED"),
    );
    const unrelatedQuery = query(
      collection(verifiedDatabase("unrelated"), "exchanges"),
      where("contributorId", "==", "owner"),
      where("status", "==", "ACCEPTED"),
    );

    await assertSucceeds(getDocs(ownerIncoming));
    await assertSucceeds(getDocs(claimantOutgoing));
    await assertFails(getDocs(unrelatedQuery));
  });

  it("denies every browser write", async () => {
    const database = verifiedDatabase("owner");
    await assertFails(updateDoc(doc(database, "coinAccounts", "owner"), { available: 999 }));
    await assertFails(updateDoc(doc(database, "clothingItems", "item-1"), { status: "EXCHANGED" }));
  });

  it("allows public images only for available garments", async () => {
    const storage = environment.unauthenticatedContext().storage();
    await assertSucceeds(storage.ref("itemImages/owner/item-1/photo.webp").getMetadata());
    await assertFails(storage.ref("itemImages/owner/draft-1/photo.webp").getMetadata());
  });

  it("keeps anonymous storage writes blocked", async () => {
    const storage = environment.unauthenticatedContext().storage();
    const upload = storage.ref("itemImages/owner/item-1/visitor.webp").put(new Uint8Array([1]), { contentType: "image/webp" });
    const result = new Promise((resolve, reject) => upload.then(resolve, reject));
    await assertFails(result);
  });

  it("allows an owner to use only five validated photo slots", async () => {
    const storage = verifiedStorage("owner");
    const validUpload = storage.ref("itemImages/owner/draft-1/photo-0").put(
      new Uint8Array([1]),
      { contentType: "image/webp" },
    );
    await assertSucceeds(new Promise((resolve, reject) => validUpload.then(resolve, reject)));

    const replacement = storage.ref("itemImages/owner/draft-1/photo-0").put(
      new Uint8Array([2]),
      { contentType: "image/png" },
    );
    await assertSucceeds(new Promise((resolve, reject) => replacement.then(resolve, reject)));

    const sixthSlot = storage.ref("itemImages/owner/draft-1/photo-5").put(
      new Uint8Array([1]),
      { contentType: "image/webp" },
    );
    await assertFails(new Promise((resolve, reject) => sixthSlot.then(resolve, reject)));
  });

  it("rejects invalid image content and uploads from another member", async () => {
    const invalidType = verifiedStorage("owner").ref("itemImages/owner/draft-1/photo-1").put(
      new Uint8Array([1]),
      { contentType: "text/html" },
    );
    await assertFails(new Promise((resolve, reject) => invalidType.then(resolve, reject)));

    const wrongOwner = verifiedStorage("claimant").ref("itemImages/owner/draft-1/photo-2").put(
      new Uint8Array([1]),
      { contentType: "image/webp" },
    );
    await assertFails(new Promise((resolve, reject) => wrongOwner.then(resolve, reject)));
  });
});
