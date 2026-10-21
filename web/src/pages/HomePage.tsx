import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <span className="brand">rewife</span>
        <div className="landing-header-actions">
          <Link className="text-action" to="/auth/signin">Sign in</Link>
          <Link className="button button-secondary" to="/auth/signup">Create account</Link>
        </div>
      </header>
      <section className="hero">
        <div>
          <p className="eyebrow">A shared wardrobe</p>
          <h1>Pass clothes forward. Discover something new.</h1>
          <p className="hero-copy">
            List a garment, earn a coin when it finds a new home, and use coins to request pieces from other members.
          </p>
          <div className="landing-hero-actions">
            <Link className="button" to="/browse">Browse garments</Link>
            <Link className="button button-secondary" to="/auth/signup">Join the pilot</Link>
          </div>
        </div>
        <div className="hero-card" aria-label="How rewife works">
          <div><strong>1</strong><span>List clothes you are ready to share</span></div>
          <div><strong>2</strong><span>Use one coin to request any garment</span></div>
          <div><strong>3</strong><span>Arrange the handover directly</span></div>
        </div>
      </section>
      <section className="principles">
        <article><h2>One garment, one coin</h2><p>No pricing and no negotiation.</p></article>
        <article><h2>People coordinate directly</h2><p>Meet locally or arrange delivery outside the platform.</p></article>
        <article><h2>Built for circulation</h2><p>Your contribution opens access to the shared wardrobe.</p></article>
      </section>
    </div>
  );
}
