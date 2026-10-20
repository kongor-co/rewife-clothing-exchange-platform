import type { DocumentData, QueryDocumentSnapshot, DocumentSnapshot } from "firebase/firestore";
import type { ClothingItem, CoinEvent, Exchange } from "../types";

export function clothingItemFromDoc(snapshot: QueryDocumentSnapshot<DocumentData> | DocumentSnapshot<DocumentData>): ClothingItem {
  return { id: snapshot.id, ...snapshot.data() } as ClothingItem;
}

export function exchangeFromDoc(snapshot: QueryDocumentSnapshot<DocumentData>): Exchange {
  return { id: snapshot.id, ...snapshot.data() } as Exchange;
}

export function coinEventFromDoc(snapshot: QueryDocumentSnapshot<DocumentData>): CoinEvent {
  return { id: snapshot.id, ...snapshot.data() } as CoinEvent;
}
