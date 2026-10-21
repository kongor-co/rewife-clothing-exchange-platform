import { Link, useLocation } from "react-router-dom";
import { authPath, currentReturnPath } from "../lib/navigation";

export function AccountRequired() {
  const location = useLocation();
  const returnPath = currentReturnPath(location.pathname, location.search);

  return (
    <div className="page-container account-required-page">
      <section className="panel account-required-panel">
        <p className="eyebrow">Member access</p>
        <h1>Continue with an account</h1>
        <p>Sign in or create an account to add garments, claim available pieces, and manage your exchanges.</p>
        <div className="account-required-actions">
          <Link className="button" to={authPath("signup", returnPath)}>Create account</Link>
          <Link className="button button-secondary" to={authPath("signin", returnPath)}>Sign in</Link>
        </div>
        <Link className="text-action" to="/browse">Keep browsing</Link>
      </section>
    </div>
  );
}
