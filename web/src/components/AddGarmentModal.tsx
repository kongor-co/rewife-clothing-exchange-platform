import { useEffect, useState, type FormEvent, type MouseEvent } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { useAuth } from "../context/AuthContext";
import { createDraft, publishItem, updateDraft } from "../lib/callables";
import { readableError } from "../lib/errors";
import { storage } from "../lib/firebase";
import { categories, conditions, fabrics, humanize, type ItemInput } from "../types";

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
  onClose: () => void;
  onCreated: (itemId: string) => void;
}

export function AddGarmentModal({ onClose, onCreated }: AddGarmentModalProps) {
  const { user } = useAuth();
  const [item, setItem] = useState<ItemInput>(initialItem);
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

  function updateField(field: keyof ItemInput, value: string) {
    setItem((current) => ({ ...current, [field]: value }));
  }

  function chooseFiles(selectedFiles: FileList | null) {
    const nextFiles = Array.from(selectedFiles || []).slice(0, 5);
    const invalid = nextFiles.find((file) => file.size > 3 * 1024 * 1024 || !["image/jpeg", "image/png", "image/webp"].includes(file.type));
    if (invalid) {
      setError("Each photo must be a JPEG, PNG, or WebP file no larger than 3 MB.");
      return;
    }
    setError("");
    setFiles(nextFiles);
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
      setError("Sign in before creating a garment.");
      return;
    }
    if (files.length === 0) {
      setError("Add at least one garment photo.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setProgress("Creating draft...");
      const draft = await createDraft(item);
      const itemId = draft.data.itemId;
      const imagePaths: string[] = [];
      for (const file of files) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `itemImages/${user.uid}/${itemId}/${crypto.randomUUID()}.${extension}`;
        imagePaths.push(path);
        setProgress(`Uploading photo ${imagePaths.length} of ${files.length}...`);
        await uploadBytes(ref(storage, path), file, { contentType: file.type });
      }
      setProgress("Publishing garment...");
      await updateDraft({ itemId, item: { ...item, imagePaths } });
      await publishItem({ itemId });
      onCreated(itemId);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <section className="garment-modal panel" role="dialog" aria-modal="true" aria-labelledby="add-garment-title">
        <header className="modal-header">
          <div><p className="eyebrow">Contribute</p><h2 id="add-garment-title">Add a garment</h2></div>
          <button className="modal-close" type="button" onClick={requestClose} disabled={busy} aria-label="Close add garment form">Close</button>
        </header>
        <p className="modal-intro">Keep it clear and honest. Every garment has the same one-coin value.</p>
        <form className="item-form" onSubmit={submit}>
          <div className="form-grid">
            <label className="full-width">Title<input autoFocus value={item.title} minLength={3} maxLength={80} onChange={(event) => updateField("title", event.target.value)} placeholder="Blue linen shirt" required /></label>
            <label>Category<select value={item.category} onChange={(event) => updateField("category", event.target.value)}>{categories.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
            <label>Size<input value={item.size} minLength={1} maxLength={20} onChange={(event) => updateField("size", event.target.value)} placeholder="M, 40, one size" required /></label>
            <label>Condition<select value={item.condition} onChange={(event) => updateField("condition", event.target.value)}>{conditions.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
            <label>Main fabric<select value={item.mainFabric} onChange={(event) => updateField("mainFabric", event.target.value)}>{fabrics.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
            <label className="full-width">Composition notes<input value={item.compositionText} maxLength={150} onChange={(event) => updateField("compositionText", event.target.value)} placeholder="100% linen" /></label>
            <label className="full-width">Description<textarea value={item.description} maxLength={500} rows={5} onChange={(event) => updateField("description", event.target.value)} placeholder="Describe fit, care, and any visible flaws." /></label>
            <label className="full-width file-input">Photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => chooseFiles(event.target.files)} /><span>Choose 1 to 5 photos, up to 3 MB each.</span></label>
          </div>
          {files.length > 0 ? <div className="file-list">{files.map((file) => <span key={`${file.name}-${file.size}`}>{file.name}</span>)}</div> : null}
          {error ? <p className="alert alert-error">{error}</p> : null}
          {progress ? <p className="alert alert-info">{progress}</p> : null}
          <div className="modal-actions">
            <button className="button button-secondary" type="button" disabled={busy} onClick={requestClose}>Cancel</button>
            <button className="button" disabled={busy}>{busy ? "Working..." : "Publish garment"}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
