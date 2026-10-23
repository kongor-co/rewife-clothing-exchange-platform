import type { ActionCodeSettings } from "firebase/auth";

export function verificationContinueUrl(origin: string): string {
  const url = new URL("/browse", origin);
  url.searchParams.set("verification", "complete");
  return url.toString();
}

export function emailVerificationActionCodeSettings(): ActionCodeSettings {
  return {
    url: verificationContinueUrl(window.location.origin),
    handleCodeInApp: false,
  };
}
