import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { acceptExchange, cancelRequestedExchange, confirmReceived, getExchangeContacts, rejectExchange, reportDispute } from "../lib/callables";
import { exchangeFromDoc } from "../lib/documents";
import { readableError } from "../lib/errors";
import { db } from "../lib/firebase";
import { humanize, type Exchange } from "../types";

interface ContactCard {
  exchangeId: string;
  displayName: string;
  email: string;
}

export function ExchangesPage() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<Exchange[]>([]);
  const [outgoing, setOutgoing] = useState<Exchange[]>([]);
  const [contact, setContact] = useState<ContactCard | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }
    const incomingQuery = query(collection(db, "exchanges"), where("contributorId", "==", user.uid), orderBy("updatedAt", "desc"));
    const outgoingQuery = query(collection(db, "exchanges"), where("claimantId", "==", user.uid), orderBy("updatedAt", "desc"));
    const stopIncoming = onSnapshot(incomingQuery, (snapshot) => setIncoming(snapshot.docs.map(exchangeFromDoc)), (caught) => setError(caught.message));
    const stopOutgoing = onSnapshot(outgoingQuery, (snapshot) => setOutgoing(snapshot.docs.map(exchangeFromDoc)), (caught) => setError(caught.message));
    return () => {
      stopIncoming();
      stopOutgoing();
    };
  }, [user]);

  const exchanges = useMemo(() => {
    const merged = new Map<string, Exchange>();
    incoming.forEach((exchange) => merged.set(exchange.id, exchange));
    outgoing.forEach((exchange) => merged.set(exchange.id, exchange));
    return Array.from(merged.values()).sort((first, second) => second.updatedAt.toMillis() - first.updatedAt.toMillis());
  }, [incoming, outgoing]);

  async function perform(exchange: Exchange, action: string) {
    setBusyId(exchange.id);
    setError("");
    try {
      if (action === "accept") {
        await acceptExchange({ exchangeId: exchange.id, contactDisclosureConsent: true });
      } else if (action === "reject") {
        await rejectExchange({ exchangeId: exchange.id });
      } else if (action === "cancel") {
        await cancelRequestedExchange({ exchangeId: exchange.id });
      } else if (action === "complete") {
        await confirmReceived({ exchangeId: exchange.id });
      } else if (action === "dispute") {
        const reason = window.prompt("Briefly describe what went wrong.");
        if (reason) {
          await reportDispute({ exchangeId: exchange.id, reason });
        }
      } else if (action === "contacts") {
        const result = await getExchangeContacts({ exchangeId: exchange.id });
        setContact({ exchangeId: exchange.id, displayName: result.data.counterpartyDisplayName, email: result.data.counterpartyEmail });
      }
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="page-container exchanges-page">
      <section className="compact-page-toolbar exchanges-toolbar">
        <div>
          <p className="eyebrow">Requests and handovers</p>
          <p className="toolbar-note">Coins move only after the recipient confirms actual receipt.</p>
        </div>
      </section>
      {error ? <p className="alert alert-error">{error}</p> : null}
      {exchanges.length === 0 ? <div className="empty-state"><h2>No exchanges yet</h2><p>Request an available garment or wait for someone to request yours.</p></div> : null}
      <section className="record-list">
        {exchanges.map((exchange) => {
          const isContributor = exchange.contributorId === user?.uid;
          const isClaimant = exchange.claimantId === user?.uid;
          const isBusy = busyId === exchange.id;
          return (
            <article className="record-card exchange-card" key={exchange.id}>
              <div>
                <p className="eyebrow">{isContributor ? "Incoming request" : "Your request"}</p>
                <h2>{exchange.itemTitle}</h2>
                <span className={`status-badge status-${exchange.status.toLowerCase()}`}>{humanize(exchange.status)}</span>
                {exchange.cancellationReason ? <p>Reason: {humanize(exchange.cancellationReason)}</p> : null}
                {exchange.disputeReason ? <p>Dispute: {exchange.disputeReason}</p> : null}
                {contact?.exchangeId === exchange.id ? <p className="contact-card">Contact {contact.displayName} at <a href={`mailto:${contact.email}`}>{contact.email}</a></p> : null}
              </div>
              <div className="record-actions">
                {isContributor ? exchange.status === "REQUESTED" ? <button className="button" disabled={isBusy} onClick={() => perform(exchange, "accept")}>Accept and share email</button> : null : null}
                {isContributor ? exchange.status === "REQUESTED" ? <button className="button button-secondary" disabled={isBusy} onClick={() => perform(exchange, "reject")}>Reject</button> : null : null}
                {isClaimant ? exchange.status === "REQUESTED" ? <button className="button button-secondary" disabled={isBusy} onClick={() => perform(exchange, "cancel")}>Cancel request</button> : null : null}
                {["ACCEPTED", "COMPLETED"].includes(exchange.status) ? <button className="button button-secondary" disabled={isBusy} onClick={() => perform(exchange, "contacts")}>Show contact</button> : null}
                {isClaimant ? exchange.status === "ACCEPTED" ? <button className="button" disabled={isBusy} onClick={() => perform(exchange, "complete")}>Confirm received</button> : null : null}
                {["ACCEPTED"].includes(exchange.status) ? <button className="text-action danger" disabled={isBusy} onClick={() => perform(exchange, "dispute")}>Report a problem</button> : null}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
