import { useState, type FormEvent } from "react";
import { ref, uploadBytes } from "firebase/storage";
import { useNavigate } from "react-router-dom";
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

export function ItemFormPage() {
  const { user } = useAuth();
  const [item, setItem] = useState<ItemInput>(initialItem);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
      navigate(`/items/${itemId}`);
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="page-container form-page">
      <section className="page-heading"><div><p className="eyebrow">Contribute</p><h1>Add a garment</h1></div><p>Keep it clear and honest. Every garment has the same one-coin value.</p></section>
      <form className="panel item-form" onSubmit={submit}>
        <div className="form-grid">
          <label className="full-width">Title<input value={item.title} minLength={3} maxLength={80} onChange={(event) => updateField("title", event.target.value)} placeholder="Blue linen shirt" required /></label>
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
        <button className="button" disabled={busy}>{busy ? "Working..." : "Publish garment"}</button>
      </form>
    </div>
  );
}
