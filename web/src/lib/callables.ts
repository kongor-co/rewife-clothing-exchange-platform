import { httpsCallable } from "firebase/functions";
import { functions } from "./firebase";
import type { ItemInput } from "../types";

export const completeOnboarding = httpsCallable<{ displayName: string }, { available: number; reserved: number }>(
  functions,
  "completeOnboarding",
);

export const updateProfile = httpsCallable<{ displayName: string }, { displayName: string }>(
  functions,
  "updateProfile",
);

export const createDraft = httpsCallable<ItemInput, { itemId: string }>(functions, "createDraft");
export const updateDraft = httpsCallable<{ itemId: string; item: ItemInput }, { itemId: string }>(
  functions,
  "updateDraft",
);
export const publishItem = httpsCallable<{ itemId: string }, { itemId: string; status: string }>(
  functions,
  "publishItem",
);
export const unpublishItem = httpsCallable<{ itemId: string }, { itemId: string; status: string }>(
  functions,
  "unpublishItem",
);
export const withdrawItem = httpsCallable<{ itemId: string }, { itemId: string; status: string }>(
  functions,
  "withdrawItem",
);
export const claimItem = httpsCallable<
  { itemId: string; operationId: string; contactDisclosureConsent: boolean },
  { exchangeId: string }
>(functions, "claimItem");
export const acceptExchange = httpsCallable<{ exchangeId: string; contactDisclosureConsent: boolean }, { status: string }>(
  functions,
  "acceptExchange",
);
export const rejectExchange = httpsCallable<{ exchangeId: string }, { status: string }>(functions, "rejectExchange");
export const cancelRequestedExchange = httpsCallable<{ exchangeId: string }, { status: string }>(
  functions,
  "cancelRequestedExchange",
);
export const confirmReceived = httpsCallable<{ exchangeId: string }, { status: string }>(functions, "confirmReceived");
export const reportDispute = httpsCallable<{ exchangeId: string; reason: string }, { status: string }>(
  functions,
  "reportDispute",
);
export const getExchangeContacts = httpsCallable<
  { exchangeId: string },
  { counterpartyDisplayName: string; counterpartyEmail: string }
>(functions, "getExchangeContacts");
