import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onIdTokenChanged, reload, type User } from "firebase/auth";
import { completeOnboarding } from "../lib/callables";
import { readableError } from "../lib/errors";
import { auth } from "../lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  memberReady: boolean;
  memberError: string;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberReady, setMemberReady] = useState(false);
  const [memberError, setMemberError] = useState("");

  const prepareVerifiedMember = useCallback(async (currentUser: User) => {
    if (!currentUser.emailVerified) {
      return;
    }

    await completeOnboarding({ displayName: currentUser.displayName || "Member" });
  }, []);

  useEffect(() => {
    let authRevision = 0;
    return onIdTokenChanged(auth, (nextUser) => {
      const currentRevision = ++authRevision;
      setUser(nextUser);
      setMemberReady(false);
      setMemberError("");
      if (!nextUser) {
        setLoading(false);
        return;
      }
      if (!nextUser.emailVerified) {
        setLoading(false);
        return;
      }

      setLoading(true);
      prepareVerifiedMember(nextUser)
        .then(() => {
          if (authRevision === currentRevision && auth.currentUser?.uid === nextUser.uid) {
            setMemberReady(true);
          }
        })
        .catch((caught) => {
          if (authRevision === currentRevision) {
            setMemberError(readableError(caught));
          }
        })
        .finally(() => {
          if (authRevision === currentRevision) {
            setLoading(false);
          }
        });
    });
  }, [prepareVerifiedMember]);

  async function refreshUser() {
    if (!auth.currentUser) {
      return;
    }
    await reload(auth.currentUser);
    await auth.currentUser.getIdToken(true);
    const currentUser = auth.currentUser;
    setUser(currentUser);
    if (!currentUser.emailVerified) {
      setMemberReady(false);
      return;
    }

    setLoading(true);
    setMemberError("");
    try {
      await prepareVerifiedMember(currentUser);
      if (auth.currentUser?.uid === currentUser.uid) {
        setMemberReady(true);
      }
    } catch (caught) {
      setMemberError(readableError(caught));
      throw caught;
    } finally {
      setLoading(false);
    }
  }

  const value = useMemo(
    () => ({ user, loading, memberReady, memberError, refreshUser }),
    [user, loading, memberReady, memberError],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
