import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../lib/firebase";
import { actionableExchangeStatus } from "../lib/exchangeActivity";

export function useExchangeActivityCount(uid: string | undefined, enabled: boolean): number {
  const [incomingCount, setIncomingCount] = useState(0);
  const [outgoingCount, setOutgoingCount] = useState(0);

  useEffect(() => {
    if (!uid || !enabled) {
      setIncomingCount(0);
      setOutgoingCount(0);
      return;
    }

    const exchanges = collection(db, "exchanges");
    const incomingQuery = query(
      exchanges,
      where("contributorId", "==", uid),
      where("status", "==", actionableExchangeStatus.contributor),
    );
    const outgoingQuery = query(
      exchanges,
      where("claimantId", "==", uid),
      where("status", "==", actionableExchangeStatus.claimant),
    );

    const stopIncoming = onSnapshot(
      incomingQuery,
      (snapshot) => setIncomingCount(snapshot.size),
      () => setIncomingCount(0),
    );
    const stopOutgoing = onSnapshot(
      outgoingQuery,
      (snapshot) => setOutgoingCount(snapshot.size),
      () => setOutgoingCount(0),
    );

    return () => {
      stopIncoming();
      stopOutgoing();
    };
  }, [enabled, uid]);

  return incomingCount + outgoingCount;
}
