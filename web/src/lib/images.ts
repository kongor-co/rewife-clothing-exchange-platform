import { getDownloadURL, ref } from "firebase/storage";
import { storage } from "./firebase";

export async function resolveImage(path: string | undefined): Promise<string | null> {
  if (!path) {
    return null;
  }
  try {
    return await getDownloadURL(ref(storage, path));
  } catch {
    return null;
  }
}
