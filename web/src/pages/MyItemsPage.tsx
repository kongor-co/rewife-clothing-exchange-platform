import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useSearchParams } from "react-router-dom";
import { AddGarmentModal } from "../components/AddGarmentModal";
import { OwnedItemCard } from "../components/OwnedItemCard";
import { useAuth } from "../context/AuthContext";
import { publishItem, unpublishItem } from "../lib/callables";
import { clothingItemFromDoc } from "../lib/documents";
import { readableError } from "../lib/errors";
import { db } from "../lib/firebase";
import type { ClothingItem } from "../types";

export function MyItemsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [addGarmentOpen, setAddGarmentOpen] = useState(searchParams.get("add") === "1");

  useEffect(() => {
    if (!user) {
      return;
    }
    const itemQuery = query(collection(db, "clothingItems"), where("ownerId", "==", user.uid), orderBy("updatedAt", "desc"));
    return onSnapshot(itemQuery, (snapshot) => {
      setItems(snapshot.docs.map(clothingItemFromDoc).filter((item) => !["DELETED", "WITHDRAWN"].includes(item.status)));
      setLoading(false);
    }, (caught) => {
      setError(caught.message);
      setLoading(false);
    });
  }, [user]);

  async function act(action: "publish" | "unpublish", itemId: string) {
    setError("");
    setBusyItemId(itemId);
    try {
      if (action === "publish") {
        await publishItem({ itemId });
      } else if (action === "unpublish") {
        await unpublishItem({ itemId });
      }
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusyItemId(null);
    }
  }

  function closeAddGarment() {
    setAddGarmentOpen(false);
    if (searchParams.has("add")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("add");
      setSearchParams(nextParams, { replace: true });
    }
  }

  return (
    <div className="page-container wardrobe-page">
      <section className="compact-page-toolbar wardrobe-toolbar">
        <p className="eyebrow">Your contributions</p>
        <button className="button" type="button" onClick={() => setAddGarmentOpen(true)}>
          Add garment
        </button>
      </section>
      {error ? <p className="alert alert-error">{error}</p> : null}
      {loading ? <div className="page-state">Loading your wardrobe...</div> : null}
      {!loading ? items.length === 0 ? <div className="empty-state"><h2>No garments yet</h2><p>Add a piece you are ready to pass forward.</p></div> : null : null}
      <section className="item-grid owned-item-grid" aria-live="polite">
        {items.map((item) => <OwnedItemCard key={item.id} item={item} busy={busyItemId === item.id} onPublish={() => act("publish", item.id)} onUnpublish={() => act("unpublish", item.id)} />)}
      </section>
      {addGarmentOpen ? <AddGarmentModal onClose={closeAddGarment} onSaved={closeAddGarment} /> : null}
    </div>
  );
}
