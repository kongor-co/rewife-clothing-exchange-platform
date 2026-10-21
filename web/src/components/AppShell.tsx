import { NavLink, Outlet, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { auth, useEmulators } from "../lib/firebase";
import { authPath, currentReturnPath, verifyEmailPath } from "../lib/navigation";

const links = [
  ["/browse", "Browse"],
  ["/my/items", "Wardrobe"],
  ["/my/exchanges", "Exchanges"],
  ["/profile", "Profile"],
];

export function AppShell() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const returnPath = currentReturnPath(location.pathname, location.search);

  const accountActions = loading ? null : user ? (
    <div className="header-auth-actions">
      {user.emailVerified ? null : <NavLink className="header-auth-link" to={verifyEmailPath(returnPath)}>Verify email</NavLink>}
      <button className="sign-out-button" type="button" onClick={() => signOut(auth)}>Sign out</button>
    </div>
  ) : (
    <div className="header-auth-actions">
      <NavLink className="header-auth-link" to={authPath("signin", returnPath)}>Sign in</NavLink>
      <NavLink className="header-create-account" to={authPath("signup", returnPath)}>Create account</NavLink>
    </div>
  );

  return (
    <div className="app-shell">
      {useEmulators ? <div className="emulator-banner">Local emulator mode</div> : null}
      <header className="site-header">
        <div className="site-header-inner">
          <div className="site-header-top">
            <NavLink className="brand" to="/browse" aria-label="rewife home">rewife</NavLink>
            {accountActions}
          </div>
          <nav aria-label="Primary navigation">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to}>{label}</NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer">
        <span>Share clothes. Keep them moving.</span>
        <div>
          <NavLink to="/privacy">Privacy</NavLink>
          <NavLink to="/terms">Terms</NavLink>
          <NavLink to="/imprint">Imprint</NavLink>
        </div>
      </footer>
    </div>
  );
}
