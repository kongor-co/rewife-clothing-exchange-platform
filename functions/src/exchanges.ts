import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { z } from "zod";
import { adminAuth, firestore, region } from "./firebase";
import { invalidInput, requireActiveMember } from "./security";
import { exchangeIdSchema, operationDocumentId, operationIdSchema } from "./validation";

const claimSchema = z.object({
  itemId: z.string().min(1).max(128),
  operationId: operationIdSchema,
  contactDisclosureConsent: z.literal(true),
}).strict();

const acceptSchema = z.object({
  exchangeId: z.string().min(1).max(128),
  contactDisclosureConsent: z.literal(true),
}).strict();

const disputeSchema = z.object({
  exchangeId: z.string().min(1).max(128),
  reason: z.string().trim().min(3).max(500),
}).strict();

export const claimItem = onCall({ region }, async (request) => {
  const identity = await requireActiveMember(request.auth);
  let input: z.infer<typeof claimSchema>;
  try {
    input = claimSchema.parse(request.data);
  } catch (error) {
    return invalidInput(error);
  }

  const itemRef = firestore.collection("clothingItems").doc(input.itemId);
  const accountRef = firestore.collection("coinAccounts").doc(identity.uid);
  const exchangeRef = firestore.collection("exchanges").doc();
  const operationRef = firestore.collection("operations").doc(operationDocumentId(identity.uid, input.operationId));
  const eventRef = firestore.collection("coinEvents").doc(`hold_${exchangeRef.id}`);

  return firestore.runTransaction(async (transaction) => {
    const [operationSnapshot, itemSnapshot, accountSnapshot] = await Promise.all([
      transaction.get(operationRef),
      transaction.get(itemRef),
      transaction.get(accountRef),
    ]);
    if (operationSnapshot.exists) {
      return { exchangeId: operationSnapshot.get("exchangeId") as string };
    }
    if (!itemSnapshot.exists) {
      throw new HttpsError("not-found", "Garment not found.");
    }
    if (!accountSnapshot.exists) {
      throw new HttpsError("failed-precondition", "Coin account not found.");
    }
    if (itemSnapshot.get("status") !== "AVAILABLE") {
      throw new HttpsError("already-exists", "This garment is no longer available.");
    }
    if (itemSnapshot.get("ownerId") === identity.uid) {
      throw new HttpsError("permission-denied", "You cannot request your own garment.");
    }
    const available = accountSnapshot.get("available") as number;
    const reserved = accountSnapshot.get("reserved") as number;
    if (available < 1) {
      throw new HttpsError("resource-exhausted", "You do not have an available coin.");
    }
    const contributorId = itemSnapshot.get("ownerId") as string;
    transaction.create(exchangeRef, {
      itemId: itemSnapshot.id,
      itemTitle: itemSnapshot.get("title") as string,
      contributorId,
      claimantId: identity.uid,
      status: "REQUESTED",
      claimOperationId: input.operationId,
      consentFlags: {
        claimantContactDisclosure: true,
        contributorContactDisclosure: false,
      },
      cancellationReason: null,
      disputeReason: null,
      resolutionReason: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(itemRef, {
      status: "RESERVED",
      activeExchangeId: exchangeRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.update(accountRef, {
      available: available - 1,
      reserved: reserved + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(eventRef, {
      kind: "HOLD_CREATED",
      amount: -1,
      affectedUserIds: [identity.uid],
      exchangeId: exchangeRef.id,
      actorId: identity.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(operationRef, {
      kind: "CLAIM_ITEM",
      actorId: identity.uid,
      itemId: itemSnapshot.id,
      exchangeId: exchangeRef.id,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { exchangeId: exchangeRef.id };
  });
});

export const acceptExchange = onCall({ region }, async (request) => {
  const identity = await requireActiveMember(request.auth);
  let input: z.infer<typeof acceptSchema>;
  try {
    input = acceptSchema.parse(request.data);
  } catch (error) {
    return invalidInput(error);
  }
  const exchangeRef = firestore.collection("exchanges").doc(input.exchangeId);
  await firestore.runTransaction(async (transaction) => {
    const exchangeSnapshot = await transaction.get(exchangeRef);
    if (!exchangeSnapshot.exists) {
      throw new HttpsError("not-found", "Exchange not found.");
    }
    if (exchangeSnapshot.get("contributorId") !== identity.uid) {
      throw new HttpsError("permission-denied", "Only the contributor can accept this request.");
    }
    if (exchangeSnapshot.get("status") !== "REQUESTED") {
      throw new HttpsError("failed-precondition", "This request is no longer awaiting a decision.");
    }
    const itemRef = firestore.collection("clothingItems").doc(exchangeSnapshot.get("itemId") as string);
    const itemSnapshot = await transaction.get(itemRef);
    if (!itemSnapshot.exists) {
      throw new HttpsError("data-loss", "The reserved garment is missing.");
    }
    if (itemSnapshot.get("status") !== "RESERVED" || itemSnapshot.get("activeExchangeId") !== input.exchangeId) {
      throw new HttpsError("data-loss", "The garment reservation does not match this exchange.");
    }
    transaction.update(exchangeRef, {
      status: "ACCEPTED",
      "consentFlags.contributorContactDisclosure": true,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { status: "ACCEPTED" };
});

async function cancelRequested(exchangeId: string, actorId: string, role: "claimant" | "contributor") {
  const exchangeRef = firestore.collection("exchanges").doc(exchangeId);
  const eventRef = firestore.collection("coinEvents").doc(`release_${exchangeId}`);
  return firestore.runTransaction(async (transaction) => {
    const exchangeSnapshot = await transaction.get(exchangeRef);
    if (!exchangeSnapshot.exists) {
      throw new HttpsError("not-found", "Exchange not found.");
    }
    const expectedActor = role === "claimant" ? exchangeSnapshot.get("claimantId") : exchangeSnapshot.get("contributorId");
    if (expectedActor !== actorId) {
      throw new HttpsError("permission-denied", "You cannot cancel this request.");
    }
    if (exchangeSnapshot.get("status") === "CANCELLED") {
      return { status: "CANCELLED" };
    }
    if (exchangeSnapshot.get("status") !== "REQUESTED") {
      throw new HttpsError("failed-precondition", "Only a requested exchange can be cancelled.");
    }
    const claimantId = exchangeSnapshot.get("claimantId") as string;
    const itemId = exchangeSnapshot.get("itemId") as string;
    const accountRef = firestore.collection("coinAccounts").doc(claimantId);
    const itemRef = firestore.collection("clothingItems").doc(itemId);
    const [accountSnapshot, itemSnapshot] = await Promise.all([
      transaction.get(accountRef),
      transaction.get(itemRef),
    ]);
    if (!accountSnapshot.exists || !itemSnapshot.exists) {
      throw new HttpsError("data-loss", "Exchange records are incomplete.");
    }
    if (itemSnapshot.get("status") !== "RESERVED" || itemSnapshot.get("activeExchangeId") !== exchangeId) {
      throw new HttpsError("data-loss", "The garment reservation does not match this exchange.");
    }
    const reserved = accountSnapshot.get("reserved") as number;
    if (reserved < 1) {
      throw new HttpsError("data-loss", "The reserved coin is missing.");
    }
    const reason = role === "claimant" ? "CLAIMANT_WITHDREW" : "CONTRIBUTOR_REJECTED";
    transaction.update(exchangeRef, { status: "CANCELLED", cancellationReason: reason, updatedAt: FieldValue.serverTimestamp() });
    transaction.update(itemRef, { status: "AVAILABLE", activeExchangeId: null, updatedAt: FieldValue.serverTimestamp() });
    transaction.update(accountRef, {
      available: (accountSnapshot.get("available") as number) + 1,
      reserved: reserved - 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(eventRef, {
      kind: "HOLD_RELEASED",
      amount: 1,
      affectedUserIds: [claimantId],
      exchangeId,
      actorId,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { status: "CANCELLED" };
  });
}

export const rejectExchange = onCall({ region }, async (request) => {
  const identity = await requireActiveMember(request.auth);
  let exchangeId: string;
  try {
    exchangeId = exchangeIdSchema.parse(request.data).exchangeId;
  } catch (error) {
    return invalidInput(error);
  }
  return cancelRequested(exchangeId, identity.uid, "contributor");
});

export const cancelRequestedExchange = onCall({ region }, async (request) => {
  const identity = await requireActiveMember(request.auth);
  let exchangeId: string;
  try {
    exchangeId = exchangeIdSchema.parse(request.data).exchangeId;
  } catch (error) {
    return invalidInput(error);
  }
  return cancelRequested(exchangeId, identity.uid, "claimant");
});

export const confirmReceived = onCall({ region }, async (request) => {
  const identity = await requireActiveMember(request.auth);
  let exchangeId: string;
  try {
    exchangeId = exchangeIdSchema.parse(request.data).exchangeId;
  } catch (error) {
    return invalidInput(error);
  }
  const exchangeRef = firestore.collection("exchanges").doc(exchangeId);
  const eventRef = firestore.collection("coinEvents").doc(`transfer_${exchangeId}`);
  return firestore.runTransaction(async (transaction) => {
    const exchangeSnapshot = await transaction.get(exchangeRef);
    if (!exchangeSnapshot.exists) {
      throw new HttpsError("not-found", "Exchange not found.");
    }
    if (exchangeSnapshot.get("claimantId") !== identity.uid) {
      throw new HttpsError("permission-denied", "Only the recipient can confirm receipt.");
    }
    if (exchangeSnapshot.get("status") === "COMPLETED") {
      return { status: "COMPLETED" };
    }
    if (exchangeSnapshot.get("status") !== "ACCEPTED") {
      throw new HttpsError("failed-precondition", "This exchange cannot be completed now.");
    }
    const claimantId = exchangeSnapshot.get("claimantId") as string;
    const contributorId = exchangeSnapshot.get("contributorId") as string;
    const itemId = exchangeSnapshot.get("itemId") as string;
    const claimantRef = firestore.collection("coinAccounts").doc(claimantId);
    const contributorRef = firestore.collection("coinAccounts").doc(contributorId);
    const itemRef = firestore.collection("clothingItems").doc(itemId);
    const [claimantSnapshot, contributorSnapshot, itemSnapshot] = await Promise.all([
      transaction.get(claimantRef),
      transaction.get(contributorRef),
      transaction.get(itemRef),
    ]);
    if (!claimantSnapshot.exists || !contributorSnapshot.exists || !itemSnapshot.exists) {
      throw new HttpsError("data-loss", "Exchange records are incomplete.");
    }
    const reserved = claimantSnapshot.get("reserved") as number;
    if (reserved < 1) {
      throw new HttpsError("data-loss", "The reserved coin is missing.");
    }
    if (itemSnapshot.get("status") !== "RESERVED" || itemSnapshot.get("activeExchangeId") !== exchangeId) {
      throw new HttpsError("data-loss", "The garment reservation does not match this exchange.");
    }
    transaction.update(exchangeRef, { status: "COMPLETED", updatedAt: FieldValue.serverTimestamp() });
    transaction.update(itemRef, { status: "EXCHANGED", activeExchangeId: null, updatedAt: FieldValue.serverTimestamp() });
    transaction.update(claimantRef, { reserved: reserved - 1, updatedAt: FieldValue.serverTimestamp() });
    transaction.update(contributorRef, {
      available: (contributorSnapshot.get("available") as number) + 1,
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(eventRef, {
      kind: "COIN_TRANSFERRED",
      amount: 1,
      affectedUserIds: [claimantId, contributorId],
      exchangeId,
      actorId: identity.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { status: "COMPLETED" };
  });
});

export const reportDispute = onCall({ region }, async (request) => {
  const identity = await requireActiveMember(request.auth);
  let input: z.infer<typeof disputeSchema>;
  try {
    input = disputeSchema.parse(request.data);
  } catch (error) {
    return invalidInput(error);
  }
  const exchangeRef = firestore.collection("exchanges").doc(input.exchangeId);
  await firestore.runTransaction(async (transaction) => {
    const exchangeSnapshot = await transaction.get(exchangeRef);
    if (!exchangeSnapshot.exists) {
      throw new HttpsError("not-found", "Exchange not found.");
    }
    const isContributor = exchangeSnapshot.get("contributorId") === identity.uid;
    const isClaimant = exchangeSnapshot.get("claimantId") === identity.uid;
    if (!isContributor) {
      if (!isClaimant) {
        throw new HttpsError("permission-denied", "Only exchange participants can report a dispute.");
      }
    }
    if (exchangeSnapshot.get("status") !== "ACCEPTED") {
      throw new HttpsError("failed-precondition", "Only an accepted exchange can be disputed.");
    }
    const itemRef = firestore.collection("clothingItems").doc(exchangeSnapshot.get("itemId") as string);
    const itemSnapshot = await transaction.get(itemRef);
    if (!itemSnapshot.exists) {
      throw new HttpsError("data-loss", "The reserved garment is missing.");
    }
    if (itemSnapshot.get("status") !== "RESERVED" || itemSnapshot.get("activeExchangeId") !== input.exchangeId) {
      throw new HttpsError("data-loss", "The garment reservation does not match this exchange.");
    }
    transaction.update(exchangeRef, {
      status: "DISPUTED",
      disputeReason: input.reason,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { status: "DISPUTED" };
});

export const getExchangeContacts = onCall({ region }, async (request) => {
  const identity = await requireActiveMember(request.auth);
  let exchangeId: string;
  try {
    exchangeId = exchangeIdSchema.parse(request.data).exchangeId;
  } catch (error) {
    return invalidInput(error);
  }
  const exchange = await firestore.collection("exchanges").doc(exchangeId).get();
  if (!exchange.exists) {
    throw new HttpsError("not-found", "Exchange not found.");
  }
  const contributorId = exchange.get("contributorId") as string;
  const claimantId = exchange.get("claimantId") as string;
  if (identity.uid !== contributorId) {
    if (identity.uid !== claimantId) {
      throw new HttpsError("permission-denied", "Only exchange participants can view contacts.");
    }
  }
  if (!["ACCEPTED", "DISPUTED", "COMPLETED"].includes(exchange.get("status") as string)) {
    throw new HttpsError("failed-precondition", "Contacts are available only after acceptance.");
  }
  if (exchange.get("consentFlags.claimantContactDisclosure") !== true) {
    throw new HttpsError("failed-precondition", "The claimant did not consent to contact disclosure.");
  }
  if (exchange.get("consentFlags.contributorContactDisclosure") !== true) {
    throw new HttpsError("failed-precondition", "The contributor did not consent to contact disclosure.");
  }
  const counterpartyId = identity.uid === contributorId ? claimantId : contributorId;
  const [counterpartyAuth, counterpartyProfile] = await Promise.all([
    adminAuth.getUser(counterpartyId),
    firestore.collection("users").doc(counterpartyId).get(),
  ]);
  if (!counterpartyAuth.email) {
    throw new HttpsError("not-found", "The counterparty has no contact email.");
  }
  return {
    counterpartyDisplayName: counterpartyProfile.get("displayName") as string,
    counterpartyEmail: counterpartyAuth.email,
  };
});
