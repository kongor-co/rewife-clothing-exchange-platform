import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { resolveImage } from "../lib/images";
import { humanize, type ClothingItem } from "../types";

interface OwnedItemCardProps {
  busy: boolean;
  item: ClothingItem;
  onPublish: () => void;
  onUnpublish: () => void;
}

export function OwnedItemCard({ busy, item, onPublish, onUnpublish }: OwnedItemCardProps) {
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
    <article className="item-card owned-item-card">
      <Link className="owned-item-card-link" to={`/items/${item.id}`}>
        <div className="item-card-image">
          {imageUrl ? <img src={imageUrl} alt={item.title} /> : <span>Photo unavailable</span>}
          <span className="item-status-pill">{humanize(item.status)}</span>
        </div>
        <div className="item-card-body">
          <p className="eyebrow">{humanize(item.category)} · {item.size}</p>
          <h2>{item.title}</h2>
          <p>{humanize(item.condition)} · {humanize(item.mainFabric)}</p>
        </div>
      </Link>
      <div className="owned-item-card-action">
        {item.status === "DRAFT" ? <button className="button" type="button" disabled={busy} onClick={onPublish}>{busy ? "Working..." : "Publish"}</button> : null}
        {item.status === "AVAILABLE" ? <button className="button button-secondary" type="button" disabled={busy} onClick={onUnpublish}>{busy ? "Working..." : "Unpublish"}</button> : null}
      </div>
    </article>
  );
}
