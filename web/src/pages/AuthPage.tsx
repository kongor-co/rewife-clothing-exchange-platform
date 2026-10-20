import { useState, type FormEvent } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { auth } from "../lib/firebase";
import { readableError } from "../lib/errors";

export function AuthPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (user) {
    return <Navigate to={user.emailVerified ? "/browse" : "/verify-email"} replace />;
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "signup") {
        const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await updateProfile(credential.user, { displayName: displayName.trim() });
        await sendEmailVerification(credential.user);
        navigate("/verify-email");
      } else {
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const destination = credential.user.emailVerified ? (location.state?.from || "/browse") : "/verify-email";
        navigate(destination);
      }
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setError("");
    setMessage("");
    if (!email.trim()) {
      setError("Enter your email address first.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMessage("Password reset email sent.");
    } catch (caught) {
      setError(readableError(caught));
    }
  }

  return (
    <div className="auth-layout">
      <section className="auth-intro">
        <a className="brand" href="/">rewife</a>
        <h1>Your wardrobe can keep moving.</h1>
        <p>Join the pilot, verify your email, and receive ten welcome coins to explore the exchange.</p>
      </section>
      <section className="auth-card">
        <div className="segmented-control" aria-label="Authentication mode">
          <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
          <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Create account</button>
        </div>
        <h2>{mode === "signin" ? "Welcome back" : "Join rewife"}</h2>
        <form onSubmit={submit}>
          {mode === "signup" ? (
            <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} minLength={2} maxLength={50} required /></label>
          ) : null}
          <label>Email<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Password<input type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required /></label>
          {error ? <p className="alert alert-error" role="alert">{error}</p> : null}
          {message ? <p className="alert alert-success" role="status">{message}</p> : null}
          <button className="button" disabled={busy}>{busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}</button>
        </form>
        {mode === "signin" ? <button type="button" className="text-action" onClick={resetPassword}>Forgot password?</button> : null}
      </section>
    </div>
  );
}
