import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { AddGarmentModal } from "../components/AddGarmentModal";
import { ItemGallery } from "../components/ItemGallery";
import { useAuth } from "../context/AuthContext";
import { claimItem, deleteItem, publishItem, unpublishItem } from "../lib/callables";
import { clothingItemFromDoc } from "../lib/documents";
import { readableError } from "../lib/errors";
import { db } from "../lib/firebase";
import { resolveImage } from "../lib/images";
import { authPath, currentReturnPath, verifyEmailPath } from "../lib/navigation";
import { humanize, type ClothingItem } from "../types";

export function ItemDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [item, setItem] = useState<ClothingItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    return onSnapshot(doc(db, "clothingItems", id), (snapshot) => {
      setItem(snapshot.exists() ? clothingItemFromDoc(snapshot) : null);
      setLoading(false);
    }, () => {
      setItem(null);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (!item || item.status === "DELETED") {
      setImages([]);
      return;
    }
    let active = true;
    Promise.all(item.imagePaths.map(resolveImage)).then((urls) => {
      if (active) {
        setImages(urls.filter((url): url is string => Boolean(url)));
      }
    });
    return () => {
      active = false;
    };
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

  async function unpublishOwnedItem() {
    if (!item || item.status !== "AVAILABLE") {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await unpublishItem({ itemId: item.id });
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function deleteOwnedItem() {
    if (!item || !["DRAFT", "AVAILABLE"].includes(item.status)) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      await deleteItem({ itemId: item.id });
      navigate("/my/items", { replace: true });
    } catch (caught) {
      setError(readableError(caught));
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="page-state">Loading garment...</div>;
  }

  if (!item || item.status === "DELETED" || item.status === "WITHDRAWN") {
    return <div className="page-state">This garment is no longer available.</div>;
  }

  const isOwner = item.ownerId === user?.uid;
  const availableToClaim = item.status === "AVAILABLE" ? !isOwner : false;
  const canRequest = availableToClaim ? Boolean(user?.emailVerified) : false;
  const guestMustJoin = availableToClaim ? !user : false;
  const memberMustVerify = availableToClaim ? user ? !user.emailVerified : false : false;
  const canManage = isOwner ? ["DRAFT", "AVAILABLE"].includes(item.status) : false;
  const returnPath = currentReturnPath(location.pathname, location.search);

  return (
    <div className="page-container item-detail-page">
      <ItemGallery images={images} title={item.title} />
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
            <button className="button" type="button" disabled={!consent || busy} onClick={requestItem}>{busy ? "Claiming..." : "Claim for 1 coin"}</button>
            <small>One coin is reserved now. Delivery arrangements stay between you and the contributor.</small>
          </div>
        ) : null}
        {guestMustJoin ? (
          <div className="request-box guest-claim-box">
            <h2>Ready to claim it?</h2>
            <p>Create an account to claim this garment, or sign in if you are already a member.</p>
            <Link className="button" to={authPath("signup", returnPath)}>Create account to claim</Link>
            <Link className="button button-secondary" to={authPath("signin", returnPath)}>Sign in</Link>
          </div>
        ) : null}
        {memberMustVerify ? (
          <div className="request-box guest-claim-box">
            <h2>Verify your email to claim</h2>
            <p>Finish setting up your account, then you can claim this garment.</p>
            <Link className="button" to={verifyEmailPath(returnPath)}>Verify email</Link>
          </div>
        ) : null}
        {canManage ? (
          <div className="owner-item-actions">
            <div className="owner-action-row">
              <button className="button button-secondary" type="button" disabled={busy} onClick={() => setEditing(true)}>Edit garment</button>
              {item.status === "DRAFT" ? <button className="button" type="button" disabled={busy} onClick={publishOwnedItem}>{busy ? "Working..." : "Publish garment"}</button> : null}
              {item.status === "AVAILABLE" ? <button className="button" type="button" disabled={busy} onClick={unpublishOwnedItem}>{busy ? "Working..." : "Unpublish garment"}</button> : null}
              <button className="button button-danger" type="button" disabled={busy} onClick={() => setConfirmDelete(true)}>Delete garment</button>
            </div>
            {confirmDelete ? (
              <div className="delete-confirmation" role="alert">
                <strong>Remove this garment from your wardrobe?</strong>
                <p>The garment will disappear from the platform, while its backend history and photos are retained.</p>
                <div>
                  <button className="button button-secondary" type="button" disabled={busy} onClick={() => setConfirmDelete(false)}>Cancel</button>
                  <button className="button button-danger" type="button" disabled={busy} onClick={deleteOwnedItem}>{busy ? "Deleting..." : "Confirm delete"}</button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
      {editing ? <AddGarmentModal item={item} onClose={() => setEditing(false)} onSaved={() => setEditing(false)} /> : null}
    </div>
  );
}
