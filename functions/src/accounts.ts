import { FieldValue, type DocumentReference, type DocumentSnapshot, type Transaction } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { adminAuth, firestore, region } from "./firebase";
import {
  invalidInput,
  requireActiveMember,
  requireAuthenticatedIdentity,
  requireVerifiedIdentity,
} from "./security";
import { usernameIdentity, type UsernameIdentity } from "./usernames";

const maximumGarmentsUpdatedWithUsername = 440;

function requestedUsername(data: unknown, fallback?: string): UsernameIdentity {
  const input = data as { username?: unknown; displayName?: unknown } | null | undefined;
  return usernameIdentity(input?.username ?? input?.displayName ?? fallback);
}

function throwUsernameTaken(): never {
  throw new HttpsError("already-exists", "username-taken");
}

function registryRef(usernameKey: string) {
  return firestore.collection("usernames").doc(usernameKey);
}

function claimRef(uid: string) {
  return firestore.collection("usernameClaims").doc(uid);
}

function registryBelongsTo(snapshot: DocumentSnapshot, uid: string): boolean {
  if (!snapshot.exists) {
    return false;
  }
  return snapshot.get("uid") === uid;
}

function createRegistry(
  transaction: Transaction,
  reference: DocumentReference,
  identity: UsernameIdentity,
  uid: string,
) {
  transaction.create(reference, {
    uid,
    username: identity.username,
    normalizedUsername: identity.normalizedUsername,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function updateRegistry(
  transaction: Transaction,
  reference: DocumentReference,
  identity: UsernameIdentity,
  uid: string,
) {
  transaction.update(reference, {
    uid,
    username: identity.username,
    normalizedUsername: identity.normalizedUsername,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function createClaim(transaction: Transaction, uid: string, identity: UsernameIdentity) {
  transaction.create(claimRef(uid), {
    username: identity.username,
    normalizedUsername: identity.normalizedUsername,
    usernameKey: identity.usernameKey,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

function updateClaim(transaction: Transaction, uid: string, identity: UsernameIdentity) {
  transaction.update(claimRef(uid), {
    username: identity.username,
    normalizedUsername: identity.normalizedUsername,
    usernameKey: identity.usernameKey,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export const reserveUsername = onCall({ region }, async (request) => {
  const member = await requireAuthenticatedIdentity(request.auth);
  let identity: UsernameIdentity;
  try {
    identity = requestedUsername(request.data);
  } catch (error) {
    return invalidInput(error);
  }

  await firestore.runTransaction(async (transaction) => {
    const memberClaimRef = claimRef(member.uid);
    const requestedRegistryRef = registryRef(identity.usernameKey);
    const [claimSnapshot, requestedRegistrySnapshot] = await Promise.all([
      transaction.get(memberClaimRef),
      transaction.get(requestedRegistryRef),
    ]);

    const previousKey = claimSnapshot.exists ? claimSnapshot.get("usernameKey") as string : null;
    let previousRegistryRef: DocumentReference | null = null;
    if (previousKey) {
      if (previousKey !== identity.usernameKey) {
        previousRegistryRef = registryRef(previousKey);
      }
    }
    const previousRegistrySnapshot = previousRegistryRef ? await transaction.get(previousRegistryRef) : null;

    if (requestedRegistrySnapshot.exists) {
      if (!registryBelongsTo(requestedRegistrySnapshot, member.uid)) {
        throwUsernameTaken();
      }
    }

    if (previousRegistryRef) {
      if (previousRegistrySnapshot) {
        if (registryBelongsTo(previousRegistrySnapshot, member.uid)) {
          transaction.delete(previousRegistryRef);
        }
      }
    }

    if (requestedRegistrySnapshot.exists) {
      updateRegistry(transaction, requestedRegistryRef, identity, member.uid);
    } else {
      createRegistry(transaction, requestedRegistryRef, identity, member.uid);
    }

    if (claimSnapshot.exists) {
      updateClaim(transaction, member.uid, identity);
    } else {
      createClaim(transaction, member.uid, identity);
    }
  });

  return { username: identity.username };
});

export const completeOnboarding = onCall({ region }, async (request) => {
  const member = await requireVerifiedIdentity(request.auth);
  let requestIdentity: UsernameIdentity;
  try {
    requestIdentity = requestedUsername(request.data, member.displayName);
  } catch (error) {
    return invalidInput(error);
  }

  const profileRef = firestore.collection("users").doc(member.uid);
  const accountRef = firestore.collection("coinAccounts").doc(member.uid);
  const eventRef = firestore.collection("coinEvents").doc(`welcome_${member.uid}`);
  const memberClaimRef = claimRef(member.uid);
  let selectedIdentity = requestIdentity;

  const balances = await firestore.runTransaction(async (transaction) => {
    const [profileSnapshot, accountSnapshot, eventSnapshot, claimSnapshot] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(accountRef),
      transaction.get(eventRef),
      transaction.get(memberClaimRef),
    ]);

    if (profileSnapshot.exists) {
      if (profileSnapshot.get("status") !== "ACTIVE") {
        throw new HttpsError("permission-denied", "This member account is not active.");
      }
    }

    try {
      selectedIdentity = profileSnapshot.exists
        ? usernameIdentity(profileSnapshot.get("displayName"))
        : claimSnapshot.exists
          ? usernameIdentity(claimSnapshot.get("username"))
          : requestIdentity;
    } catch (error) {
      return invalidInput(error);
    }

    const selectedRegistryRef = registryRef(selectedIdentity.usernameKey);
    const selectedRegistrySnapshot = await transaction.get(selectedRegistryRef);
    const previousClaimKey = claimSnapshot.exists ? claimSnapshot.get("usernameKey") as string : null;
    let previousRegistryRef: DocumentReference | null = null;
    if (previousClaimKey) {
      if (previousClaimKey !== selectedIdentity.usernameKey) {
        previousRegistryRef = registryRef(previousClaimKey);
      }
    }
    const previousRegistrySnapshot = previousRegistryRef ? await transaction.get(previousRegistryRef) : null;

    if (selectedRegistrySnapshot.exists) {
      if (!registryBelongsTo(selectedRegistrySnapshot, member.uid)) {
        throwUsernameTaken();
      }
    }

    if (previousRegistryRef) {
      if (previousRegistrySnapshot) {
        if (registryBelongsTo(previousRegistrySnapshot, member.uid)) {
          transaction.delete(previousRegistryRef);
        }
      }
    }

    if (selectedRegistrySnapshot.exists) {
      updateRegistry(transaction, selectedRegistryRef, selectedIdentity, member.uid);
    } else {
      createRegistry(transaction, selectedRegistryRef, selectedIdentity, member.uid);
    }

    if (claimSnapshot.exists) {
      updateClaim(transaction, member.uid, selectedIdentity);
    } else {
      createClaim(transaction, member.uid, selectedIdentity);
    }

    if (profileSnapshot.exists) {
      transaction.update(profileRef, {
        displayName: selectedIdentity.username,
        usernameKey: selectedIdentity.usernameKey,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      transaction.create(profileRef, {
        displayName: selectedIdentity.username,
        usernameKey: selectedIdentity.usernameKey,
        status: "ACTIVE",
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    if (accountSnapshot.exists) {
      return {
        available: accountSnapshot.get("available") as number,
        reserved: accountSnapshot.get("reserved") as number,
      };
    }

    if (eventSnapshot.exists) {
      throw new HttpsError("data-loss", "Welcome event exists without a coin account.");
    }

    transaction.create(accountRef, {
      available: 10,
      reserved: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(eventRef, {
      kind: "WELCOME_ISSUED",
      amount: 10,
      affectedUserIds: [member.uid],
      exchangeId: null,
      actorId: member.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { available: 10, reserved: 0 };
  });

  await adminAuth.updateUser(member.uid, { displayName: selectedIdentity.username });
  return balances;
});

export const updateProfile = onCall({ region }, async (request) => {
  const member = await requireActiveMember(request.auth);
  let nextIdentity: UsernameIdentity;
  try {
    nextIdentity = requestedUsername(request.data);
  } catch (error) {
    return invalidInput(error);
  }

  const profileRef = firestore.collection("users").doc(member.uid);
  const memberClaimRef = claimRef(member.uid);
  const nextRegistryRef = registryRef(nextIdentity.usernameKey);
  const ownedItemsQuery = firestore.collection("clothingItems").where("ownerId", "==", member.uid);

  await firestore.runTransaction(async (transaction) => {
    const [profileSnapshot, claimSnapshot, nextRegistrySnapshot, ownedItemsSnapshot] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(memberClaimRef),
      transaction.get(nextRegistryRef),
      transaction.get(ownedItemsQuery),
    ]);

    if (!profileSnapshot.exists || profileSnapshot.get("status") !== "ACTIVE") {
      throw new HttpsError("failed-precondition", "Complete onboarding before updating your username.");
    }

    if (ownedItemsSnapshot.size > maximumGarmentsUpdatedWithUsername) {
      throw new HttpsError("failed-precondition", "Contact support to change the username on this account.");
    }

    const profileIdentity = usernameIdentity(profileSnapshot.get("displayName"));
    const previousKeys = new Set<string>([profileSnapshot.get("usernameKey") || profileIdentity.usernameKey]);
    if (claimSnapshot.exists) {
      previousKeys.add(claimSnapshot.get("usernameKey") as string);
    }
    previousKeys.delete(nextIdentity.usernameKey);

    const previousRegistries = await Promise.all(
      [...previousKeys].map(async (key) => {
        const reference = registryRef(key);
        return { reference, snapshot: await transaction.get(reference) };
      }),
    );

    if (nextRegistrySnapshot.exists) {
      if (!registryBelongsTo(nextRegistrySnapshot, member.uid)) {
        throwUsernameTaken();
      }
    }

    for (const previous of previousRegistries) {
      if (registryBelongsTo(previous.snapshot, member.uid)) {
        transaction.delete(previous.reference);
      }
    }

    if (nextRegistrySnapshot.exists) {
      updateRegistry(transaction, nextRegistryRef, nextIdentity, member.uid);
    } else {
      createRegistry(transaction, nextRegistryRef, nextIdentity, member.uid);
    }

    if (claimSnapshot.exists) {
      updateClaim(transaction, member.uid, nextIdentity);
    } else {
      createClaim(transaction, member.uid, nextIdentity);
    }

    transaction.update(profileRef, {
      displayName: nextIdentity.username,
      usernameKey: nextIdentity.usernameKey,
      updatedAt: FieldValue.serverTimestamp(),
    });
    for (const itemSnapshot of ownedItemsSnapshot.docs) {
      transaction.update(itemSnapshot.ref, { ownerDisplayName: nextIdentity.username });
    }
  });

  await adminAuth.updateUser(member.uid, { displayName: nextIdentity.username });
  return { username: nextIdentity.username, displayName: nextIdentity.username };
});
