export type AuthMode = "signin" | "signup";

export function safeInternalPath(value: unknown, fallback = "/browse"): string {
  if (typeof value !== "string") {
    return fallback;
  }
  if (!value.startsWith("/")) {
    return fallback;
  }
  if (value.startsWith("//")) {
    return fallback;
  }
  return value;
}

export function currentReturnPath(pathname: string, search: string): string {
  return safeInternalPath(`${pathname}${search}`);
}

export function authPath(mode: AuthMode, returnPath: string): string {
  return `/auth/${mode}?from=${encodeURIComponent(safeInternalPath(returnPath))}`;
}

export function verifyEmailPath(returnPath: string): string {
  return `/verify-email?from=${encodeURIComponent(safeInternalPath(returnPath))}`;
}

export function returnPathFromSearch(search: string, fallback = "/browse"): string {
  return safeInternalPath(new URLSearchParams(search).get("from"), fallback);
}
