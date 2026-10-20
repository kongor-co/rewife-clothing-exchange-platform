import { NavLink, Outlet } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, useEmulators } from "../lib/firebase";

const links = [
  ["/browse", "Browse"],
  ["/items/new", "Add garment"],
  ["/my/items", "My garments"],
  ["/my/exchanges", "Exchanges"],
  ["/profile", "Profile"],
];

export function AppShell() {
  return (
    <div className="app-shell">
      {useEmulators ? <div className="emulator-banner">Local emulator mode</div> : null}
      <header className="site-header">
        <NavLink className="brand" to="/browse" aria-label="rewife home">rewife</NavLink>
        <nav aria-label="Primary navigation">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to}>{label}</NavLink>
          ))}
          <button className="link-button" type="button" onClick={() => signOut(auth)}>Sign out</button>
        </nav>
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
