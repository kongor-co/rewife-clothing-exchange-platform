import { useState } from "react";
import { sendEmailVerification, signOut } from "firebase/auth";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";
import { readableError } from "../lib/errors";
import { authPath, returnPathFromSearch } from "../lib/navigation";

export function VerifyEmailPage() {
  const { user, loading, refreshUser } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = returnPathFromSearch(location.search);

  if (loading) {
    return <div className="page-state">Checking your account...</div>;
  }
  if (!user) {
    return <Navigate to={authPath("signin", returnPath)} replace />;
  }

  async function checkVerification() {
    setBusy(true);
    setError("");
    try {
      await refreshUser();
      const currentUser = auth.currentUser;
      if (!currentUser?.emailVerified) {
        setMessage("Your email is not verified yet. Open the link in the verification email, then try again.");
        return;
      }
      navigate(returnPath, { replace: true });
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setError("");
    const currentUser = user;
    if (!currentUser) {
      return;
    }
    try {
      await sendEmailVerification(currentUser);
      setMessage("A new verification email was sent.");
    } catch (caught) {
      setError(readableError(caught));
    }
  }

  return (
    <div className="centered-page">
      <section className="panel narrow-panel">
        <p className="eyebrow">One more step</p>
        <h1>Verify your email</h1>
        <p>We sent a verification link to <strong>{user.email}</strong>. Verification protects the pilot and unlocks your ten welcome coins.</p>
        {message ? <p className="alert alert-info">{message}</p> : null}
        {error ? <p className="alert alert-error">{error}</p> : null}
        <button className="button" type="button" disabled={busy} onClick={checkVerification}>{busy ? "Checking..." : "I verified my email"}</button>
        <button className="button button-secondary" type="button" onClick={resend}>Resend email</button>
        <button className="text-action" type="button" onClick={() => signOut(auth)}>Use another account</button>
      </section>
    </div>
  );
}
