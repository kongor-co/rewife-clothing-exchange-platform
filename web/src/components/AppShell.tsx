import { NavLink, Outlet, useLocation } from "react-router-dom";
import { signOut } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { useExchangeActivityCount } from "../hooks/useExchangeActivityCount";
import { exchangeActivityLabel } from "../lib/exchangeActivity";
import { auth, useEmulators } from "../lib/firebase";
import { authPath, currentReturnPath } from "../lib/navigation";

const links: Array<{ to: string; label: string; showsActivity?: boolean }> = [
  { to: "/browse", label: "Browse" },
  { to: "/my/items", label: "Wardrobe" },
  { to: "/my/exchanges", label: "Exchanges", showsActivity: true },
  { to: "/profile", label: "Profile" },
];

export function AppShell() {
  const { user, loading, memberReady } = useAuth();
  const location = useLocation();
  const returnPath = currentReturnPath(location.pathname, location.search);
  const activityCount = useExchangeActivityCount(user?.uid, memberReady);
  const activityLabel = activityCount > 0 ? exchangeActivityLabel(activityCount) : "";

  const accountActions = loading ? null : user ? (
    <div className="header-auth-actions">
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
            {links.map(({ to, label, showsActivity }) => (
              <NavLink
                aria-label={showsActivity ? activityCount > 0 ? `${label}, ${activityLabel}` : label : undefined}
                key={to}
                title={showsActivity ? activityCount > 0 ? activityLabel : undefined : undefined}
                to={to}
              >
                <span>{label}</span>
                {showsActivity ? activityCount > 0 ? (
                  <span className="nav-activity-badge" aria-hidden="true">
                    {activityCount > 9 ? "9+" : activityCount}
                  </span>
                ) : null : null}
              </NavLink>
            ))}
            <span className="sr-only" aria-live="polite">{activityLabel}</span>
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
