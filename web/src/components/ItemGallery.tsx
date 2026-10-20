import { useEffect, useState, type KeyboardEvent } from "react";

interface ItemGalleryProps {
  images: string[];
  title: string;
}

export function ItemGallery({ images, title }: ItemGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  function move(step: number) {
    setActiveIndex((current) => (current + step + images.length) % images.length);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (images.length < 2) {
      return;
    }
    if (event.key === "ArrowLeft") {
      move(-1);
    }
    if (event.key === "ArrowRight") {
      move(1);
    }
  }

  if (images.length === 0) {
    return <section className="interactive-gallery"><div className="image-placeholder">Photo unavailable</div></section>;
  }

  return (
    <section className="interactive-gallery" tabIndex={0} onKeyDown={handleKeyDown} aria-label={`${title} photo gallery`}>
      <div className="gallery-main">
        <img src={images[activeIndex]} alt={`${title}, photo ${activeIndex + 1} of ${images.length}`} />
        {images.length > 1 ? (
          <div className="gallery-controls">
            <button type="button" onClick={() => move(-1)} aria-label="Previous photo">‹</button>
            <span>{activeIndex + 1} / {images.length}</span>
            <button type="button" onClick={() => move(1)} aria-label="Next photo">›</button>
          </div>
        ) : null}
      </div>
      {images.length > 1 ? (
        <div className="gallery-thumbnails" aria-label="Choose a photo">
          {images.map((url, index) => (
            <button className={index === activeIndex ? "active" : ""} type="button" key={url} onClick={() => setActiveIndex(index)} aria-label={`Show photo ${index + 1}`} aria-current={index === activeIndex ? "true" : undefined}>
              <img src={url} alt="" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
