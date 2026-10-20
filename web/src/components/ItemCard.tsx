import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { resolveImage } from "../lib/images";
import { humanize, type ClothingItem } from "../types";

export function ItemCard({ item }: { item: ClothingItem }) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    resolveImage(item.imagePaths[0]).then((url) => {
      if (active) {
        setImageUrl(url);
      }
    });
    return () => {
      active = false;
    };
  }, [item.imagePaths]);

  return (
    <Link className="item-card" to={`/items/${item.id}`}>
      <div className="item-card-image">
        {imageUrl ? <img src={imageUrl} alt={item.title} /> : <span>Photo unavailable</span>}
        <span className="coin-pill">1 coin</span>
      </div>
      <div className="item-card-body">
        <p className="eyebrow">{humanize(item.category)} · {item.size}</p>
        <h2>{item.title}</h2>
        <p>{humanize(item.condition)} · {humanize(item.mainFabric)}</p>
        <small>From {item.ownerDisplayName}</small>
      </div>
    </Link>
  );
}
