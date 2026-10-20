import { getApp, getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";

const useEmulators = import.meta.env.DEV || import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true";
const emulatorProjectId = import.meta.env.VITE_FIREBASE_EMULATOR_PROJECT_ID || "demo-rewife";

function requiredProductionValue(name: string): string {
  const value = import.meta.env[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required production environment value: ${name}`);
  }
  return value;
}

const firebaseConfig = useEmulators
  ? {
      apiKey: "demo-key",
      authDomain: `${emulatorProjectId}.firebaseapp.com`,
      projectId: emulatorProjectId,
      storageBucket: `${emulatorProjectId}.appspot.com`,
      messagingSenderId: "demo-sender",
      appId: "demo-app",
    }
  : {
      apiKey: requiredProductionValue("VITE_FIREBASE_API_KEY"),
      authDomain: requiredProductionValue("VITE_FIREBASE_AUTH_DOMAIN"),
      projectId: requiredProductionValue("VITE_FIREBASE_PROJECT_ID"),
      storageBucket: requiredProductionValue("VITE_FIREBASE_STORAGE_BUCKET"),
      messagingSenderId: requiredProductionValue("VITE_FIREBASE_MESSAGING_SENDER_ID"),
      appId: requiredProductionValue("VITE_FIREBASE_APP_ID"),
    };

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "europe-west3");
export const storage = getStorage(app);

if (useEmulators) {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  } catch {
    // Vite hot reload can evaluate this module after the emulators are connected.
  }
}

export { useEmulators };
