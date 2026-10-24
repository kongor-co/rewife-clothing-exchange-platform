import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { onAuthStateChanged, reload, type User } from "firebase/auth";
import { completeOnboarding } from "../lib/callables";
import { readableError } from "../lib/errors";
import { auth } from "../lib/firebase";

interface AuthState {
  user: User | null;
  loading: boolean;
  memberReady: boolean;
  memberError: string;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberReady, setMemberReady] = useState(false);
  const [memberError, setMemberError] = useState("");
  const verificationSyncing = useRef(false);

  const prepareVerifiedMember = useCallback(async (currentUser: User) => {
    if (!currentUser.emailVerified) {
      return;
    }

    await completeOnboarding({ username: currentUser.displayName || "Member" });
  }, []);

  useEffect(() => {
    let authRevision = 0;
    return onAuthStateChanged(auth, (nextUser) => {
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
      nextUser.getIdToken(true)
        .then(() => prepareVerifiedMember(nextUser))
        .then(() => {
          if (authRevision === currentRevision && auth.currentUser?.uid === nextUser.uid) {
            setUser(auth.currentUser);
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

  const synchronizeVerification = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser || currentUser.emailVerified || verificationSyncing.current) {
      return;
    }
    verificationSyncing.current = true;
    try {
      await reload(currentUser);
      const refreshedUser = auth.currentUser;
      if (refreshedUser?.emailVerified) {
        setLoading(true);
        setMemberReady(false);
        setMemberError("");
        setUser(refreshedUser);
        await refreshedUser.getIdToken(true);
        await prepareVerifiedMember(refreshedUser);
        if (auth.currentUser?.uid === refreshedUser.uid) {
          setUser(auth.currentUser);
          setMemberReady(true);
        }
      }
    } catch (caught) {
      setMemberError(readableError(caught));
    } finally {
      setLoading(false);
      verificationSyncing.current = false;
    }
  }, [prepareVerifiedMember]);

  useEffect(() => {
    if (user && !user.emailVerified) {
      void synchronizeVerification().catch(() => undefined);
    }
  }, [synchronizeVerification, user?.uid]);

  useEffect(() => {
    function refreshWhenVisible() {
      if (document.visibilityState === "visible") {
        void synchronizeVerification().catch(() => undefined);
      }
    }

    window.addEventListener("focus", synchronizeVerification);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", synchronizeVerification);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [synchronizeVerification]);

  const value = useMemo(
    () => ({ user, loading, memberReady, memberError }),
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
