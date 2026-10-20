import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import { createDraft, publishItem, updateDraft } from "../lib/callables";
import { readableError } from "../lib/errors";
import { storage } from "../lib/firebase";
import { resolveImage } from "../lib/images";
import { categories, conditions, fabrics, humanize, type ClothingItem, type ItemInput } from "../types";

const initialItem: ItemInput = {
  title: "",
  category: "TOP",
  size: "",
  condition: "GOOD",
  mainFabric: "UNKNOWN",
  description: "",
  compositionText: "",
  imagePaths: [],
};

interface AddGarmentModalProps {
  item?: ClothingItem;
  onClose: () => void;
  onSaved: (itemId: string) => void;
}

function itemToInput(item?: ClothingItem): ItemInput {
  if (!item) {
    return initialItem;
  }
  return {
    title: item.title,
    category: item.category,
    size: item.size,
    condition: item.condition,
    mainFabric: item.mainFabric,
    description: item.description,
    compositionText: item.compositionText,
    imagePaths: item.imagePaths,
  };
}

export function AddGarmentModal({ item: existingItem, onClose, onSaved }: AddGarmentModalProps) {
  const { user } = useAuth();
  const [item, setItem] = useState<ItemInput>(() => itemToInput(existingItem));
  const [existingImagePaths, setExistingImagePaths] = useState<string[]>(existingItem?.imagePaths || []);
  const [existingImageUrls, setExistingImageUrls] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.classList.add("modal-open");
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!busy) {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.classList.remove("modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, onClose]);

  useEffect(() => {
    let active = true;
    Promise.all(existingImagePaths.map(async (path) => [path, await resolveImage(path)] as const)).then((entries) => {
      if (active) {
        setExistingImageUrls(Object.fromEntries(entries.filter((entry) => Boolean(entry[1]))) as Record<string, string>);
      }
    });
    return () => {
      active = false;
    };
  }, [existingImagePaths]);

  function updateField(field: keyof ItemInput, value: string) {
    setItem((current) => ({ ...current, [field]: value }));
  }

  function chooseFiles(selectedFiles: FileList | null) {
    const nextFiles = Array.from(selectedFiles || []);
    if (existingImagePaths.length + nextFiles.length > 5) {
      setError(`You can add ${5 - existingImagePaths.length} more photos.`);
      return;
    }
    const invalid = nextFiles.find((file) => file.size > 3 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type));
    if (invalid) {
      setError("Each photo must be a JPEG, PNG, or WebP file no larger than 3 MB.");
      return;
    }
    setError("");
    setFiles(nextFiles);
  }

  function removeExistingPhoto(path: string) {
    setExistingImagePaths((current) => current.filter((candidate) => candidate !== path));
    setError("");
  }

  function removeNewPhoto(index: number) {
    setFiles((current) => current.filter((_, candidateIndex) => candidateIndex !== index));
    setError("");
  }

  function requestClose() {
    if (!busy) {
      onClose();
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      requestClose();
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) {
      setError("Sign in before saving a garment.");
      return;
    }
    if (existingImagePaths.length + files.length === 0) {
      setError("Add at least one garment photo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let itemId = existingItem?.id;
      if (!itemId) {
        setProgress("Creating draft...");
        const draft = await createDraft(item);
        itemId = draft.data.itemId;
      }
      const imagePaths = [...existingImagePaths];
      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `itemImages/${user.uid}/${itemId}/${crypto.randomUUID()}.${extension}`;
        imagePaths.push(path);
        setProgress(`Uploading new photo ${imagePaths.length - existingImagePaths.length} of ${files.length}...`);
        await uploadBytes(ref(storage, path), file, { contentType: file.type });
      }
      setProgress(existingItem ? "Saving changes..." : "Publishing garment...");
      await updateDraft({ itemId, item: { ...item, imagePaths } });
      if (!existingItem) {
        await publishItem({ itemId });
      }
      onSaved(itemId);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  const editing = Boolean(existingItem);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <section className="garment-modal panel" role="dialog" aria-modal="true" aria-labelledby="garment-form-title">
        <header className="modal-header">
          <div><p className="eyebrow">{editing ? "Update" : "Contribute"}</p><h2 id="garment-form-title">{editing ? "Edit garment" : "Add a garment"}</h2></div>
          <button className="modal-close" type="button" onClick={requestClose} disabled={busy} aria-label="Close garment form">Close</button>
        </header>
        <p className="modal-intro">{editing ? "Update the garment details or choose which photos should be visible." : "Keep it clear and honest. Every garment has the same one-coin value."}</p>
        <form className="item-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="full-width">Title<input autoFocus value={item.title} minLength={3} maxLength={80} onChange={(event) => updateField("title", event.target.value)} placeholder="Blue linen shirt" required /></label>
            <label>Category<select value={item.category} onChange={(event) => updateField("category", event.target.value)}>{categories.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
            <label>Size<input value={item.size} minLength={1} maxLength={20} onChange={(event) => updateField("size", event.target.value)} placeholder="M, 40, one size" required /></label>
            <label>Condition<select value={item.condition} onChange={(event) => updateField("condition", event.target.value)}>{conditions.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
            <label>Main fabric<select value={item.mainFabric} onChange={(event) => updateField("mainFabric", event.target.value)}>{fabrics.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
            <label className="full-width">Composition notes<input value={item.compositionText} maxLength={150} onChange={(event) => updateField("compositionText", event.target.value)} placeholder="100% linen" /></label>
            <label className="full-width">Description<textarea value={item.description} maxLength={500} rows={5} onChange={(event) => updateField("description", event.target.value)} placeholder="Describe fit, care, and any visible flaws." /></label>
            {existingImagePaths.length > 0 ? (
              <div className="full-width existing-photo-grid" aria-label="Current garment photos">
                {existingImagePaths.map((path, index) => (
                  <div className="existing-photo" key={path}>
                    {existingImageUrls[path] ? <img src={existingImageUrls[path]} alt={`Garment photo ${index + 1}`} /> : <div className="image-placeholder">Photo</div>}
                    <button className="text-action danger" type="button" disabled={busy} onClick={() => removeExistingPhoto(path)}>Remove</button>
                  </div>
                ))}
              </div>
            ) : null}
            <label className="full-width file-input">Photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => chooseFiles(event.target.files)} /><span>Keep 1 to 5 photos in total, up to 3 MB each.</span></label>
          </div>
          {files.length > 0 ? <div className="file-list">{files.map((file, index) => <span key={`${file.name}-${file.size}-${index}`}>{file.name}<button type="button" onClick={() => removeNewPhoto(index)} aria-label={`Remove ${file.name}`}>Remove</button></span>)}</div> : null}
          {error ? <p className="alert alert-error">{error}</p> : null}
          {progress ? <p className="alert alert-info">{progress}</p> : null}
          <div className="modal-actions">
            <button className="button button-secondary" type="button" disabled={busy} onClick={requestClose}>Cancel</button>
            <button className="button" disabled={busy}>{busy ? "Working..." : editing ? "Save changes" : "Publish garment"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
