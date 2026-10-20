import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { claimItem, publishItem } from "../lib/callables";
import { clothingItemFromDoc } from "../lib/documents";
import { readableError } from "../lib/errors";
import { db } from "../lib/firebase";
import { resolveImage } from "../lib/images";
import { humanize, type ClothingItem } from "../types";

export function ItemDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      return;
    }
    return onSnapshot(doc(db, "clothingItems", id), (snapshot) => {
      setItem(snapshot.exists() ? clothingItemFromDoc(snapshot) : null);
    });
  }, [id]);

  useEffect(() => {
    if (!item) {
      return;
    }
    Promise.all(item.imagePaths.map(resolveImage)).then((urls) => {
      setImages(urls.filter((url): url is string => Boolean(url)));
    });
  }, [item]);

  async function requestItem() {
    if (!item) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await claimItem({
        itemId: item.id,
        operationId: crypto.randomUUID(),
        contactDisclosureConsent: consent,
      });
      navigate(`/my/exchanges?selected=${result.data.exchangeId}`);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function publishOwnedItem() {
    if (!item || item.status !== "DRAFT") {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await publishItem({ itemId: item.id });
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  }

  if (!item) {
    return <div className="page-state">Loading garment...</div>;
  }

  const isOwner = item.ownerId === user?.uid;
  const canRequest = item.status === "AVAILABLE" ? !isOwner : false;

  return (
    <div className="page-container item-detail-page">
      <section className="image-gallery">
        {images.length > 0 ? images.map((url, index) => <img key={url} src={url} alt={`${item.title}, photo ${index + 1}`} />) : <div className="image-placeholder">Photo unavailable</div>}
      </section>
      <section className="item-details panel">
        <p className="eyebrow">{humanize(item.category)} · {item.size}</p>
        <h1>{item.title}</h1>
        <div className="price-line"><strong>1 coin</strong><span>{humanize(item.status)}</span></div>
        <dl className="details-list">
          <div><dt>Condition</dt><dd>{humanize(item.condition)}</dd></div>
          <div><dt>Main fabric</dt><dd>{humanize(item.mainFabric)}</dd></div>
          {item.compositionText ? <div><dt>Composition</dt><dd>{item.compositionText}</dd></div> : null}
          <div><dt>Contributor</dt><dd>{item.ownerDisplayName}</dd></div>
        </dl>
        {item.description ? <p className="item-description">{item.description}</p> : null}
        {error ? <p className="alert alert-error">{error}</p> : null}
        {canRequest ? (
          <div className="request-box">
            <label className="checkbox-label"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />If accepted, I agree to share my verified email with the contributor.</label>
            <button className="button" type="button" disabled={!consent || busy} onClick={requestItem}>{busy ? "Requesting..." : "Request for 1 coin"}</button>
            <small>One coin is reserved now. Delivery arrangements stay between you and the contributor.</small>
          </div>
        ) : null}
        {isOwner ? (
          <div className="owner-item-actions">
            <p className="alert alert-info">This is your garment.</p>
            {item.status === "DRAFT" ? <button className="button" type="button" disabled={busy} onClick={publishOwnedItem}>{busy ? "Publishing..." : "Publish garment"}</button> : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}
