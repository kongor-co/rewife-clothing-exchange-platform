import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { publishItem, unpublishItem, withdrawItem } from "../lib/callables";
import { clothingItemFromDoc } from "../lib/documents";
import { readableError } from "../lib/errors";
import { db } from "../lib/firebase";
import { humanize, type ClothingItem } from "../types";

export function MyItemsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [error, setError] = useState("");
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      return;
    }
    const itemQuery = query(collection(db, "clothingItems"), where("ownerId", "==", user.uid), orderBy("updatedAt", "desc"));
    return onSnapshot(itemQuery, (snapshot) => setItems(snapshot.docs.map(clothingItemFromDoc)), (caught) => setError(caught.message));
  }, [user]);

  async function act(action: "publish" | "unpublish" | "withdraw", itemId: string) {
    setError("");
    setBusyItemId(itemId);
    try {
      if (action === "publish") {
        await publishItem({ itemId });
      } else if (action === "unpublish") {
        await unpublishItem({ itemId });
      } else {
        await withdrawItem({ itemId });
      }
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusyItemId(null);
    }
  }

  return (
    <div className="page-container">
      <section className="page-heading"><div><p className="eyebrow">Your contributions</p><h1>My garments</h1></div><Link className="button" to="/items/new">Add garment</Link></section>
      {error ? <p className="alert alert-error">{error}</p> : null}
      {items.length === 0 ? <div className="empty-state"><h2>No garments yet</h2><p>Add a piece you are ready to pass forward.</p></div> : null}
      <section className="record-list">
        {items.map((item) => (
          <article className="record-card" key={item.id}>
            <div><p className="eyebrow">{humanize(item.status)}</p><h2><Link to={`/items/${item.id}`}>{item.title}</Link></h2><p>{humanize(item.category)} · {item.size} · {humanize(item.mainFabric)}</p></div>
            <div className="record-actions">
              {item.status === "DRAFT" ? <button className="button" type="button" disabled={busyItemId === item.id} onClick={() => act("publish", item.id)}>{busyItemId === item.id ? "Publishing..." : "Publish"}</button> : null}
              {item.status === "AVAILABLE" ? <button className="button button-secondary" type="button" disabled={busyItemId === item.id} onClick={() => act("unpublish", item.id)}>Unpublish</button> : null}
              {item.status === "DRAFT" || item.status === "AVAILABLE" ? <button className="text-action danger" type="button" disabled={busyItemId === item.id} onClick={() => act("withdraw", item.id)}>Withdraw</button> : null}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
