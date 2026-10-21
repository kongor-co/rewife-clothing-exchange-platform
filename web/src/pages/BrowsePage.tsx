import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { ItemCard } from "../components/ItemCard";
import { MultiSelectFilter } from "../components/MultiSelectFilter";
import { sizeOptionsForCategories } from "../garmentOptions";
import { clothingItemFromDoc } from "../lib/documents";
import { db } from "../lib/firebase";
import {
  categories,
  conditions,
  fabrics,
  humanize,
  type Category,
  type ClothingItem,
  type Condition,
  type Fabric,
} from "../types";

export function BrowsePage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<Condition[]>([]);
  const [selectedFabrics, setSelectedFabrics] = useState<Fabric[]>([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

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

  const sizeOptions = useMemo(() => sizeOptionsForCategories(selectedCategories), [selectedCategories]);
  const activeFilterCount = selectedCategories.length + selectedConditions.length + selectedFabrics.length + selectedSizes.length;

  const visibleItems = useMemo(() => items.filter((item) => {
    if (selectedCategories.length > 0) {
      if (!selectedCategories.includes(item.category)) {
        return false;
      }
    }
    if (selectedConditions.length > 0) {
      if (!selectedConditions.includes(item.condition)) {
        return false;
      }
    }
    if (selectedFabrics.length > 0) {
      if (!selectedFabrics.includes(item.mainFabric)) {
        return false;
      }
    }
    if (selectedSizes.length > 0) {
      if (!selectedSizes.includes(item.size)) {
        return false;
      }
    }
    return true;
  }), [items, selectedCategories, selectedConditions, selectedFabrics, selectedSizes]);

  function clearFilters() {
    setSelectedCategories([]);
    setSelectedConditions([]);
    setSelectedFabrics([]);
    setSelectedSizes([]);
  }

  return (
    <div className="page-container">
      <section className="page-heading browse-heading">
        <div><p className="eyebrow">The shared wardrobe</p><h1>Find your next favorite piece</h1></div>
        <p>Every garment costs one coin. Arrange the handover directly with its contributor.</p>
      </section>
      <section className="filters" aria-label="Catalog filters">
        <div className="filters-heading">
          <div><h2>Filter garments</h2><p>{visibleItems.length} {visibleItems.length === 1 ? "garment" : "garments"}</p></div>
          {activeFilterCount > 0 ? <button className="filter-clear-all" type="button" onClick={clearFilters}>Clear all</button> : null}
        </div>
        <div className="filter-controls">
          <MultiSelectFilter label="Category" options={categories} selected={selectedCategories} onChange={setSelectedCategories} formatOption={humanize} />
          <MultiSelectFilter label="Condition" options={conditions} selected={selectedConditions} onChange={setSelectedConditions} formatOption={humanize} />
          <MultiSelectFilter label="Main fabric" options={fabrics} selected={selectedFabrics} onChange={setSelectedFabrics} formatOption={humanize} searchable searchPlaceholder="Search fabrics" />
          <MultiSelectFilter label="Size" options={sizeOptions} selected={selectedSizes} onChange={setSelectedSizes} searchable searchPlaceholder="Search EU sizes" />
        </div>
      </section>
      {loading ? <div className="page-state">Loading garments...</div> : null}
      {error ? <p className="alert alert-error">{error}</p> : null}
      {!loading ? visibleItems.length === 0 ? <div className="empty-state"><h2>No garments found</h2><p>Try clearing a filter or add the first listing.</p></div> : null : null}
      <section className="item-grid" aria-live="polite">{visibleItems.map((item) => <ItemCard key={item.id} item={item} />)}</section>
    </div>
  );
}
