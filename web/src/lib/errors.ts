import { FirebaseError } from "firebase/app";

const messages: Record<string, string> = {
  "auth/email-already-in-use": "An account already exists for this email address.",
  "auth/invalid-credential": "The email address or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/weak-password": "Use a password with at least six characters.",
  "functions/email-unverified": "Verify your email address before continuing.",
  "functions/already-exists": "This username is already in use. Choose another username.",
  "functions/failed-precondition": "This action is not available in the current state.",
  "functions/permission-denied": "You do not have permission to perform this action.",
  "functions/resource-exhausted": "There are not enough available coins for this request.",
};

export function isUsernameTakenError(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) {
    return false;
  }
  return error.code === "functions/already-exists";
}

export function readableError(error: unknown): string {
  if (error instanceof FirebaseError) {
    return messages[error.code] || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong. Please try again.";
}
