import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { ItemCard } from "../components/ItemCard";
import { clothingItemFromDoc } from "../lib/documents";
import { db } from "../lib/firebase";
import { categories, conditions, fabrics, humanize, type ClothingItem } from "../types";

export function BrowsePage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [fabric, setFabric] = useState("");
  const [size, setSize] = useState("");

  useEffect(() => {
    const itemQuery = query(
      collection(db, "clothingItems"),
      where("status", "==", "AVAILABLE"),
      orderBy("publishedAt", "desc"),
      limit(50),
    );
    return onSnapshot(itemQuery, (snapshot) => {
      setItems(snapshot.docs.map(clothingItemFromDoc));
      setLoading(false);
    }, (caught) => {
      setError(caught.message);
      setLoading(false);
    });
  }, []);

  const visibleItems = useMemo(() => items.filter((item) => {
    if (category) {
      if (item.category !== category) {
        return false;
      }
    }
    if (condition) {
      if (item.condition !== condition) {
        return false;
      }
    }
    if (fabric) {
      if (item.mainFabric !== fabric) {
        return false;
      }
    }
    if (size) {
      if (!item.size.toLowerCase().includes(size.toLowerCase())) {
        return false;
      }
    }
    return true;
  }), [items, category, condition, fabric, size]);

  return (
    <div className="page-container">
      <section className="page-heading browse-heading">
        <div><p className="eyebrow">The shared wardrobe</p><h1>Find your next favorite piece</h1></div>
        <p>Every garment costs one coin. Arrange the handover directly with its contributor.</p>
      </section>
      <section className="filters" aria-label="Catalog filters">
        <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All</option>{categories.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
        <label>Condition<select value={condition} onChange={(event) => setCondition(event.target.value)}><option value="">All</option>{conditions.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
        <label>Main fabric<select value={fabric} onChange={(event) => setFabric(event.target.value)}><option value="">All</option>{fabrics.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
        <label>Size<input value={size} onChange={(event) => setSize(event.target.value)} placeholder="Any size" /></label>
      </section>
      {loading ? <div className="page-state">Loading garments...</div> : null}
      {error ? <p className="alert alert-error">{error}</p> : null}
      {!loading ? visibleItems.length === 0 ? <div className="empty-state"><h2>No garments found</h2><p>Try clearing a filter or add the first listing.</p></div> : null : null}
      <section className="item-grid" aria-live="polite">{visibleItems.map((item) => <ItemCard key={item.id} item={item} />)}</section>
    </div>
  );
}
