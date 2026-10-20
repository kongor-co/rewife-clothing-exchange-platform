import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { adminStorage, firestore, region } from "./firebase";
import { invalidInput, requireActiveMember } from "./security";
import { itemIdSchema, itemInputSchema } from "./validation";

function validateOwnedImagePaths(paths: string[], uid: string, itemId: string): void {
  const prefix = `itemImages/${uid}/${itemId}/`;
  if (paths.length < 1 || paths.length > 5) {
    throw new HttpsError("invalid-argument", "Published garments need one to five photos.");
  }
  for (const path of paths) {
    if (!path.startsWith(prefix)) {
      throw new HttpsError("invalid-argument", "A photo path is outside this garment folder.");
    }
  }
}

export const createDraft = onCall({ region }, async (request) => {
  const identity = await requireActiveMember(request.auth);
  let item;
  try {
    item = itemInputSchema.parse(request.data);
  } catch (error) {
    return invalidInput(error);
  }
  const profile = await firestore.collection("users").doc(identity.uid).get();
  const itemRef = firestore.collection("clothingItems").doc();
  await itemRef.create({
    ownerId: identity.uid,
    ownerDisplayName: profile.get("displayName") as string,
    ...item,
    imagePaths: [],
    status: "DRAFT",
    activeExchangeId: null,
    publishedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { itemId: itemRef.id };
});

export const updateDraft = onCall({ region }, async (request) => {
  const identity = await requireActiveMember(request.auth);
  let itemId: string;
  let item;
  try {
    itemId = itemIdSchema.parse({ itemId: request.data?.itemId }).itemId;
    item = itemInputSchema.parse(request.data?.item);
  } catch (error) {
    return invalidInput(error);
  }
  const itemRef = firestore.collection("clothingItems").doc(itemId);
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(itemRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Garment not found.");
    }
    if (snapshot.get("ownerId") !== identity.uid) {
      throw new HttpsError("permission-denied", "Only the owner can edit this garment.");
    }
    if (snapshot.get("status") !== "DRAFT") {
      throw new HttpsError("failed-precondition", "Only drafts can be edited.");
    }
    for (const path of item.imagePaths) {
      const prefix = `itemImages/${identity.uid}/${itemId}/`;
      if (!path.startsWith(prefix)) {
        throw new HttpsError("invalid-argument", "A photo path is outside this garment folder.");
      }
    }
    transaction.update(itemRef, { ...item, updatedAt: FieldValue.serverTimestamp() });
  });
  return { itemId };
});

export const publishItem = onCall({ region }, async (request) => {
  const identity = await requireActiveMember(request.auth);
  let itemId: string;
  try {
    itemId = itemIdSchema.parse(request.data).itemId;
  } catch (error) {
    return invalidInput(error);
  }
  const itemRef = firestore.collection("clothingItems").doc(itemId);
  const itemSnapshot = await itemRef.get();
  if (!itemSnapshot.exists) {
    throw new HttpsError("not-found", "Garment not found.");
  }
  if (itemSnapshot.get("ownerId") !== identity.uid) {
    throw new HttpsError("permission-denied", "Only the owner can publish this garment.");
  }
  const imagePaths = itemSnapshot.get("imagePaths") as string[];
  validateOwnedImagePaths(imagePaths, identity.uid, itemId);
  const existence = await Promise.all(imagePaths.map((path) => adminStorage.bucket().file(path).exists()));
  if (existence.some(([exists]) => !exists)) {
    throw new HttpsError("failed-precondition", "One or more garment photos are missing.");
  }
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(itemRef);
    if (snapshot.get("status") !== "DRAFT") {
      throw new HttpsError("failed-precondition", "Only a draft can be published.");
    }
    transaction.update(itemRef, {
      status: "AVAILABLE",
      publishedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { itemId, status: "AVAILABLE" };
});

export const unpublishItem = onCall({ region }, async (request) => {
  const identity = await requireActiveMember(request.auth);
  let itemId: string;
  try {
    itemId = itemIdSchema.parse(request.data).itemId;
  } catch (error) {
    return invalidInput(error);
  }
  const itemRef = firestore.collection("clothingItems").doc(itemId);
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(itemRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Garment not found.");
    }
    if (snapshot.get("ownerId") !== identity.uid) {
      throw new HttpsError("permission-denied", "Only the owner can unpublish this garment.");
    }
    if (snapshot.get("status") !== "AVAILABLE") {
      throw new HttpsError("failed-precondition", "Only an available garment can be unpublished.");
    }
    transaction.update(itemRef, { status: "DRAFT", publishedAt: null, updatedAt: FieldValue.serverTimestamp() });
  });
  return { itemId, status: "DRAFT" };
});

export const withdrawItem = onCall({ region }, async (request) => {
  const identity = await requireActiveMember(request.auth);
  let itemId: string;
  try {
    itemId = itemIdSchema.parse(request.data).itemId;
  } catch (error) {
    return invalidInput(error);
  }
  const itemRef = firestore.collection("clothingItems").doc(itemId);
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(itemRef);
    if (!snapshot.exists) {
      throw new HttpsError("not-found", "Garment not found.");
    }
    if (snapshot.get("ownerId") !== identity.uid) {
      throw new HttpsError("permission-denied", "Only the owner can withdraw this garment.");
    }
    if (!["DRAFT", "AVAILABLE"].includes(snapshot.get("status") as string)) {
      throw new HttpsError("failed-precondition", "This garment cannot be withdrawn now.");
    }
    transaction.update(itemRef, { status: "WITHDRAWN", publishedAt: null, updatedAt: FieldValue.serverTimestamp() });
  });
  return { itemId, status: "WITHDRAWN" };
});
