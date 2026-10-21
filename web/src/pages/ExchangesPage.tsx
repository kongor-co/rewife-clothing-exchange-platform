import { useEffect, useMemo, useState } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { acceptExchange, cancelRequestedExchange, confirmReceived, getExchangeContacts, rejectExchange, reportDispute } from "../lib/callables";
import { clothingItemFromDoc, exchangeFromDoc } from "../lib/documents";
import { readableError } from "../lib/errors";
import {
  exchangeDirection,
  exchangeHasContactAccess,
  exchangeMatchesFilters,
  exchangeStatusFilterOptions,
  exchangeStatusLabel,
  type ExchangeDirectionFilter,
  type ExchangeStatusFilter,
} from "../lib/exchangePresentation";
import { db } from "../lib/firebase";
import { resolveImage } from "../lib/images";
import { humanize, type ClothingItem, type Exchange, type Fabric } from "../types";

interface ContactDetails {
  displayName: string;
  email: string;
}

interface ExchangeItemDetails {
  size: string;
  mainFabric: Fabric | undefined;
  imagePath: string | null;
}

function ExchangeContact({ exchangeId }: { exchangeId: string }) {
  const [contact, setContact] = useState<ContactDetails | null>(null);
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    let active = true;
    getExchangeContacts({ exchangeId })
      .then((result) => {
        if (active) {
          setContact({
            displayName: result.data.counterpartyDisplayName,
            email: result.data.counterpartyEmail,
          });
        }
      })
      .catch((caught) => {
        if (active) {
          setContactError(readableError(caught));
        }
      });
    return () => {
      active = false;
    };
  }, [exchangeId]);

  if (contactError) {
    return <p className="exchange-contact-error">Contact details are temporarily unavailable.</p>;
  }
  if (!contact) {
    return <p className="exchange-contact-loading">Loading contact...</p>;
  }
  return (
    <address className="exchange-contact-card">
      <span>Contact</span>
      <strong>{contact.displayName}</strong>
      <a href={`mailto:${contact.email}`}>{contact.email}</a>
    </address>
  );
}

function ExchangeItemSummary({ exchange, label, userId }: { exchange: Exchange; label: string; userId: string }) {
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getDoc(doc(db, "clothingItems", exchange.itemId))
      .then((snapshot) => {
        if (active) {
          setItem(snapshot.exists() ? clothingItemFromDoc(snapshot) : null);
        }
      })
      .catch(() => {
        if (active) {
          setItem(null);
        }
      });
    return () => {
      active = false;
    };
  }, [exchange.itemId]);

  const details: ExchangeItemDetails = {
    size: item?.size || exchange.itemSize || "",
    mainFabric: item?.mainFabric || exchange.itemMainFabric,
    imagePath: item?.imagePaths[0] || exchange.itemImagePath || null,
  };

  useEffect(() => {
    let active = true;
    resolveImage(details.imagePath || undefined).then((url) => {
      if (active) {
        setImageUrl(url);
      }
    });
    return () => {
      active = false;
    };
  }, [details.imagePath]);

  return (
    <div className="exchange-card-main">
      <Link className="exchange-item-image" to={`/items/${exchange.itemId}`} aria-label={`View ${exchange.itemTitle}`}>
        {imageUrl ? (
          <img src={imageUrl} alt={exchange.itemTitle} onError={() => setImageUrl(null)} />
        ) : (
          <img className="exchange-item-placeholder" src="/rewife-icon.png" alt="" />
        )}
      </Link>
      <div className="exchange-card-copy">
        <p className="eyebrow">{label}</p>
        <h2><Link to={`/items/${exchange.itemId}`}>{exchange.itemTitle}</Link></h2>
        {details.size || details.mainFabric ? (
          <dl className="exchange-item-meta">
            {details.size ? <div><dt>Size</dt><dd>{details.size}</dd></div> : null}
            {details.mainFabric ? <div><dt>Material</dt><dd>{humanize(details.mainFabric)}</dd></div> : null}
          </dl>
        ) : null}
        <span className={`status-badge status-${exchange.status.toLowerCase()}`}>{exchangeStatusLabel(exchange, userId)}</span>
        {exchange.cancellationReason ? <p>Reason: {humanize(exchange.cancellationReason)}</p> : null}
        {exchange.disputeReason ? <p>Dispute: {exchange.disputeReason}</p> : null}
      </div>
    </div>
  );
}

export function ExchangesPage() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<Exchange[]>([]);
  const [outgoing, setOutgoing] = useState<Exchange[]>([]);
  const [incomingLoading, setIncomingLoading] = useState(true);
  const [outgoingLoading, setOutgoingLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState<ExchangeDirectionFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<ExchangeStatusFilter>("ALL");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }
    const incomingQuery = query(collection(db, "exchanges"), where("contributorId", "==", user.uid), orderBy("updatedAt", "desc"));
    const outgoingQuery = query(collection(db, "exchanges"), where("claimantId", "==", user.uid), orderBy("updatedAt", "desc"));
    const stopIncoming = onSnapshot(incomingQuery, (snapshot) => {
      setIncoming(snapshot.docs.map(exchangeFromDoc));
      setIncomingLoading(false);
    }, (caught) => {
      setError(caught.message);
      setIncomingLoading(false);
    });
    const stopOutgoing = onSnapshot(outgoingQuery, (snapshot) => {
      setOutgoing(snapshot.docs.map(exchangeFromDoc));
      setOutgoingLoading(false);
    }, (caught) => {
      setError(caught.message);
      setOutgoingLoading(false);
    });
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

  const visibleExchanges = useMemo(() => {
    if (!user) {
      return [];
    }
    return exchanges.filter((exchange) => exchangeMatchesFilters(exchange, user.uid, directionFilter, statusFilter));
  }, [directionFilter, exchanges, statusFilter, user]);

  const loading = incomingLoading || outgoingLoading;

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
      {exchanges.length > 0 ? (
        <section className="exchange-filters" aria-label="Exchange filters">
          <div className="exchange-direction-filter" role="group" aria-label="Request direction">
            <button aria-pressed={directionFilter === "ALL"} className={directionFilter === "ALL" ? "active" : ""} type="button" onClick={() => setDirectionFilter("ALL")}>All <span>{exchanges.length}</span></button>
            <button aria-pressed={directionFilter === "OUTGOING"} className={directionFilter === "OUTGOING" ? "active" : ""} type="button" onClick={() => setDirectionFilter("OUTGOING")}>My requests <span>{outgoing.length}</span></button>
            <button aria-pressed={directionFilter === "INCOMING"} className={directionFilter === "INCOMING" ? "active" : ""} type="button" onClick={() => setDirectionFilter("INCOMING")}>Incoming <span>{incoming.length}</span></button>
          </div>
          <label className="exchange-status-filter">
            <span>Status</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ExchangeStatusFilter)}>
              {exchangeStatusFilterOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </section>
      ) : null}
      {loading ? <div className="page-state">Loading exchanges...</div> : null}
      {!loading ? exchanges.length === 0 ? <div className="empty-state"><h2>No exchanges yet</h2><p>Request an available garment or wait for someone to request yours.</p></div> : null : null}
      {!loading ? exchanges.length > 0 ? visibleExchanges.length === 0 ? <div className="empty-state compact-empty-state"><h2>No matching exchanges</h2><p>Try another request type or status.</p></div> : null : null : null}
      <section className="record-list exchange-list" aria-live="polite">
        {visibleExchanges.map((exchange) => {
          const isContributor = exchange.contributorId === user?.uid;
          const isClaimant = exchange.claimantId === user?.uid;
          const isBusy = busyId === exchange.id;
          const direction = user ? exchangeDirection(exchange, user.uid) : "INCOMING";
          return (
            <article className="record-card exchange-card" key={exchange.id}>
              <ExchangeItemSummary exchange={exchange} label={direction === "INCOMING" ? "Incoming request" : "Your request"} userId={user?.uid || ""} />
              <div className="record-actions">
                {isContributor ? exchange.status === "REQUESTED" ? <button className="button" disabled={isBusy} onClick={() => perform(exchange, "accept")}>Accept and share email</button> : null : null}
                {isContributor ? exchange.status === "REQUESTED" ? <button className="button button-secondary" disabled={isBusy} onClick={() => perform(exchange, "reject")}>Reject</button> : null : null}
                {isClaimant ? exchange.status === "REQUESTED" ? <button className="button button-secondary" disabled={isBusy} onClick={() => perform(exchange, "cancel")}>Cancel request</button> : null : null}
                {isClaimant ? exchange.status === "ACCEPTED" ? <button className="button" disabled={isBusy} onClick={() => perform(exchange, "complete")}>Confirm received</button> : null : null}
                {["ACCEPTED"].includes(exchange.status) ? <button className="text-action danger" disabled={isBusy} onClick={() => perform(exchange, "dispute")}>Report a problem</button> : null}
              </div>
              <div className="exchange-contact-slot">
                {exchangeHasContactAccess(exchange) ? <ExchangeContact exchangeId={exchange.id} /> : <p className="exchange-contact-hint">Contact details appear after acceptance.</p>}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}
