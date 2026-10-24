import { createHash } from "node:crypto";
import { usernameSchema } from "./validation";

export interface UsernameIdentity {
  username: string;
  normalizedUsername: string;
  usernameKey: string;
}

export function usernameIdentity(value: unknown): UsernameIdentity {
  const username = usernameSchema.parse(value);
  const normalizedUsername = username.toLocaleLowerCase("en-US");
  const usernameKey = createHash("sha256").update(normalizedUsername, "utf8").digest("hex");
  return { username, normalizedUsername, usernameKey };
}
