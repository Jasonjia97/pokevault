import { useEffect, useState } from "react";

type DashboardData = {
  totalCards: number;
  totalSpent: string;
  totalStarred: number;
  cardsBySet: Array<{ set_id: string; set_name: string; card_count: number }>;
};

async function loadDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/dashboard", { credentials: "same-origin" });
  if (!response.ok) throw new Error("Could not load your dashboard.");
  return response.json() as Promise<DashboardData>;
}

export function Dashboard({
  userEmail,
  onNavigate,
  onLogout,
}: {
  userEmail: string;
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
}) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadDashboard()
      .then((result) => { if (active) setData(result); })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load your dashboard.");
      });
    return () => { active = false; };
  }, []);

  const maxCards = Math.max(1, ...(data?.cardsBySet.map((set) => set.card_count) ?? []));

  return (
    <main className="sets-layout">
      <header className="topbar">
        <a className="brand" href="/sets" onClick={(event) => { event.preventDefault(); onNavigate("/sets"); }}>
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>Poké<span>Vault</span></span>
        </a>
        <div className="account-controls">
          <span className="account-email">{userEmail}</span>
          <button className="secondary-button" type="button" onClick={onLogout}>Sign out</button>
        </div>
      </header>
      <section className="dashboard-main">
        <nav className="cards-nav" aria-label="Collection navigation">
          <button className="text-button" onClick={() => onNavigate("/sets")}>← Sets</button>
          <button className="text-button" onClick={() => onNavigate("/cards")}>Cards</button>
          <button className="text-button" onClick={() => onNavigate("/wishlist")}>Wishlist</button>
          <button className="text-button" onClick={() => onNavigate("/favorites")}>Favorites</button>
        </nav>
        <div className="card-page-heading">
          <div><span className="eyebrow">YOUR COLLECTION</span><h1>Dashboard</h1><p>A summary of your Pokémon collection.</p></div>
          <button className="primary-button" onClick={() => onNavigate("/cards")}>View cards</button>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {!data ? <div className="empty-state">{error ? "Dashboard unavailable." : "Loading dashboard…"}</div> : (
          <>
            <section className="dashboard-metrics" aria-label="Collection totals">
              <article className="dashboard-metric"><span>Owned cards</span><strong>{data.totalCards}</strong></article>
              <article className="dashboard-metric"><span>Total purchase spending</span><strong>${Number(data.totalSpent).toFixed(2)}</strong></article>
              <article className="dashboard-metric"><span>Starred cards</span><strong>{data.totalStarred}</strong></article>
            </section>
            <figure className="dashboard-chart">
              <figcaption>Owned cards by Pokémon set</figcaption>
              {data.cardsBySet.length === 0 ? <p className="empty-state">No owned cards to chart yet.</p> : (
                <div className="dashboard-bars" role="img" aria-label={data.cardsBySet.map((set) => `${set.set_name}: ${set.card_count} cards`).join(", ")}>
                  {data.cardsBySet.map((set) => (
                    <div className="dashboard-bar-row" key={set.set_id}>
                      <span className="dashboard-bar-label">{set.set_name}</span>
                      <div className="dashboard-bar-track"><span style={{ width: `${set.card_count / maxCards * 100}%` }} /></div>
                      <strong>{set.card_count}</strong>
                    </div>
                  ))}
                </div>
              )}
            </figure>
          </>
        )}
      </section>
      <footer className="page-footer"><span>PokéVault</span><span>Private to your account.</span></footer>
    </main>
  );
}
