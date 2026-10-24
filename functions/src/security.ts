import { HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import { adminAuth, firestore } from "./firebase";

type CallableAuth = CallableRequest["auth"];

export interface MemberIdentity {
  uid: string;
  email: string;
  displayName: string;
}

export async function requireAuthenticatedIdentity(auth: CallableAuth): Promise<MemberIdentity> {
  if (!auth) {
    throw new HttpsError("unauthenticated", "Sign in to continue.");
  }
  const user = await adminAuth.getUser(auth.uid);
  if (user.disabled) {
    throw new HttpsError("permission-denied", "This account is disabled.");
  }
  if (!user.email) {
    throw new HttpsError("failed-precondition", "A verified email address is required.");
  }
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || "Member",
  };
}

export async function requireVerifiedIdentity(auth: CallableAuth): Promise<MemberIdentity> {
  const identity = await requireAuthenticatedIdentity(auth);
  const user = await adminAuth.getUser(identity.uid);
  if (!user.emailVerified) {
    throw new HttpsError("failed-precondition", "email-unverified");
  }
  return identity;
}

export async function requireActiveMember(auth: CallableAuth): Promise<MemberIdentity> {
  const identity = await requireVerifiedIdentity(auth);
  const profile = await firestore.collection("users").doc(identity.uid).get();
  if (!profile.exists) {
    throw new HttpsError("failed-precondition", "Complete onboarding before continuing.");
  }
  if (profile.get("status") !== "ACTIVE") {
    throw new HttpsError("permission-denied", "This member account is not active.");
  }
  return identity;
}

export function invalidInput(error: unknown): never {
  const message = error instanceof Error ? error.message : "Invalid request data.";
  throw new HttpsError("invalid-argument", message);
}
