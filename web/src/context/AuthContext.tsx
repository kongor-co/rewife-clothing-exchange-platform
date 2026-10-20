import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onIdTokenChanged, reload, type User } from "firebase/auth";
import { auth } from "../lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onIdTokenChanged(auth, (nextUser) => {
    setUser(nextUser);
    setLoading(false);
  }), []);

  async function refreshUser() {
    if (!auth.currentUser) {
      return;
    }
    await reload(auth.currentUser);
    await auth.currentUser.getIdToken(true);
    setUser(auth.currentUser);
  }

  const value = useMemo(() => ({ user, loading, refreshUser }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
