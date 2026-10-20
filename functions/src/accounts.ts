import { FieldValue } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { firestore, region } from "./firebase";
import { invalidInput, requireActiveMember, requireVerifiedIdentity } from "./security";
import { displayNameSchema } from "./validation";

export const completeOnboarding = onCall({ region }, async (request) => {
  const identity = await requireVerifiedIdentity(request.auth);
  let displayName: string;
  try {
    displayName = displayNameSchema.parse(request.data?.displayName || identity.displayName);
  } catch (error) {
    return invalidInput(error);
  }

  const profileRef = firestore.collection("users").doc(identity.uid);
  const accountRef = firestore.collection("coinAccounts").doc(identity.uid);
  const eventRef = firestore.collection("coinEvents").doc(`welcome_${identity.uid}`);

  return firestore.runTransaction(async (transaction) => {
    const [profileSnapshot, accountSnapshot, eventSnapshot] = await Promise.all([
      transaction.get(profileRef),
      transaction.get(accountRef),
      transaction.get(eventRef),
    ]);

    if (profileSnapshot.exists) {
      if (profileSnapshot.get("status") !== "ACTIVE") {
        throw new HttpsError("permission-denied", "This member account is not active.");
      }
    } else {
      transaction.create(profileRef, {
        displayName,
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
      affectedUserIds: [identity.uid],
      exchangeId: null,
      actorId: identity.uid,
      createdAt: FieldValue.serverTimestamp(),
    });
    return { available: 10, reserved: 0 };
  });
});

export const updateProfile = onCall({ region }, async (request) => {
  const identity = await requireActiveMember(request.auth);
  let displayName: string;
  try {
    displayName = displayNameSchema.parse(request.data?.displayName);
  } catch (error) {
    return invalidInput(error);
  }
  await firestore.collection("users").doc(identity.uid).update({
    displayName,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { displayName };
});
