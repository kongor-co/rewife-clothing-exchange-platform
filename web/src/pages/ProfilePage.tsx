import { useEffect, useState, type FormEvent } from "react";
import { collection, doc, limit, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { updateProfile as updateAuthProfile } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { updateProfile } from "../lib/callables";
import { coinEventFromDoc } from "../lib/documents";
import { readableError } from "../lib/errors";
import { auth, db } from "../lib/firebase";
import { humanize, type CoinAccount, type CoinEvent, type UserProfile } from "../types";

export function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [account, setAccount] = useState<CoinAccount | null>(null);
  const [events, setEvents] = useState<CoinEvent[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      return;
    }
    const stopProfile = onSnapshot(doc(db, "users", user.uid), (snapshot) => {
      const data = snapshot.data() as UserProfile | undefined;
      setProfile(data || null);
      setDisplayName(data?.displayName || user.displayName || "");
    }, (caught) => setError(readableError(caught)));
    const stopAccount = onSnapshot(
      doc(db, "coinAccounts", user.uid),
      (snapshot) => setAccount(snapshot.exists() ? snapshot.data() as CoinAccount : null),
      (caught) => setError(readableError(caught)),
    );
    const eventQuery = query(collection(db, "coinEvents"), where("affectedUserIds", "array-contains", user.uid), orderBy("createdAt", "desc"), limit(25));
    const stopEvents = onSnapshot(
      eventQuery,
      (snapshot) => setEvents(snapshot.docs.map(coinEventFromDoc)),
      (caught) => setError(readableError(caught)),
    );
    return () => {
      stopProfile();
      stopAccount();
      stopEvents();
    };
  }, [user]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await updateProfile({ displayName: displayName.trim() });
      if (auth.currentUser) {
        await updateAuthProfile(auth.currentUser, { displayName: displayName.trim() });
      }
      setMessage("Profile updated.");
    } catch (caught) {
      setError(readableError(caught));
    }
  }

  return (
    <div className="page-container profile-grid">
      <section className="panel profile-panel">
        <p className="eyebrow">Your account</p>
        <h1>{profile?.displayName || "Member"}</h1>
        <p>{user?.email}</p>
        <div className="balance-grid">
          <div><strong>{account?.available ?? 0}</strong><span>Available coins</span></div>
          <div><strong>{account?.reserved ?? 0}</strong><span>Reserved coins</span></div>
        </div>
        <form onSubmit={save}>
          <label>Display name<input value={displayName} minLength={2} maxLength={50} onChange={(event) => setDisplayName(event.target.value)} required /></label>
          {message ? <p className="alert alert-success">{message}</p> : null}
          {error ? <p className="alert alert-error">{error}</p> : null}
          <button className="button">Save profile</button>
        </form>
      </section>
      <section className="panel">
        <p className="eyebrow">Ledger</p>
        <h2>Coin activity</h2>
        {events.length === 0 ? <p>No coin activity yet.</p> : (
          <ul className="event-list">
            {events.map((event) => <li key={event.id}><span>{humanize(event.kind)}</span><strong>{event.amount > 0 ? "+" : ""}{event.amount}</strong></li>)}
          </ul>
        )}
      </section>
    </div>
  );
}
