import { useEffect, useState, type FormEvent } from "react";
import { CardWorkspace } from "./CardPages";
import { Dashboard } from "./Dashboard";

type User = {
  id: string;
  email: string;
};

type PokemonSet = {
  id: string;
  name: string;
  created_at: string;
};

type AuthMode = "signup" | "login";

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "The request could not be completed.");
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function Brand() {
  return (
    <a className="brand" href="/" aria-label="PokéVault home">
      <span className="brand-mark" aria-hidden="true">
        <span />
      </span>
      <span>
        Poké<span>Vault</span>
      </span>
    </a>
  );
}

function AuthPage({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await apiRequest<{ user: User }>(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onSignedIn(result.user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setError("");
    setMode((current) => (current === "signup" ? "login" : "signup"));
  }

  return (
    <main className="auth-layout">
      <header className="topbar auth-topbar">
        <Brand />
        <span className="topbar-note">A private home for your collection</span>
      </header>
      <section className="auth-content">
        <div className="auth-intro">
          <span className="eyebrow">POKÉVAULT · YOUR COLLECTION STARTS HERE</span>
          <h1>
            Keep your favorites
            <br />
            <span>close.</span>
          </h1>
          <p>
            Create a private account to organize your Pokémon card sets in one
            calm, personal space.
          </p>
          <div className="privacy-note">
            <span aria-hidden="true">✓</span>
            Your sets are visible only to your account.
          </div>
        </div>

        <section className="auth-card" aria-labelledby="auth-heading">
          <div className="eyebrow">{mode === "signup" ? "GET STARTED" : "WELCOME BACK"}</div>
          <h2 id="auth-heading">
            {mode === "signup" ? "Create your account" : "Sign in"}
          </h2>
          <p className="card-subtitle">
            {mode === "signup"
              ? "A little space for everything you collect."
              : "Your Pokémon sets are waiting for you."}
          </p>
          <form onSubmit={submit} className="auth-form">
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={8}
              maxLength={72}
              required
              placeholder="8 characters or more"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && <p className="form-error" role="alert">{error}</p>}
            <button className="primary-button" type="submit" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create my account"
                  : "Sign in to PokéVault"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>
          <p className="mode-switch">
            {mode === "signup" ? "Already have an account?" : "New to PokéVault?"}{" "}
            <button type="button" onClick={switchMode}>
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </section>
      </section>
      <footer className="page-footer">
        <span>PokéVault</span>
        <span>Keep your favorites close.</span>
      </footer>
    </main>
  );
}

function SetsPage({
  user,
  sets,
  loading,
  onCreate,
  onNavigate,
  onLogout,
}: {
  user: User;
  sets: PokemonSet[];
  loading: boolean;
  onCreate: (name: string) => Promise<void>;
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await onCreate(name);
      setName("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this set.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="sets-layout">
      <header className="topbar">
        <Brand />
        <div className="account-controls">
          <span className="account-email">{user.email}</span>
          <button className="secondary-button" type="button" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </header>

      <section className="sets-main">
        <div className="sets-heading">
          <div>
            <span className="eyebrow">YOUR POKÉVAULT</span>
            <h1>Your Pokémon sets</h1>
            <p>Start by adding the sets that make up your collection.</p>
          </div>
          <span className="set-count">
            {sets.length} {sets.length === 1 ? "set" : "sets"}
          </span>
          <button className="secondary-button" onClick={() => onNavigate("/cards")}>
            View cards
          </button>
          <a className="secondary-button" href="/api/cards/export.csv" download="pokevault-cards.csv">
            Download CSV
          </a>
          <button className="secondary-button" onClick={() => onNavigate("/wishlist")}>
            Wishlist
          </button>
          <button className="secondary-button" onClick={() => onNavigate("/dashboard")}>
            Dashboard
          </button>
        </div>

        <section className="create-panel" aria-labelledby="create-heading">
          <div className="panel-icon" aria-hidden="true">＋</div>
          <div className="create-copy">
            <h2 id="create-heading">Add a set</h2>
            <p>Use the official set name, such as Scarlet &amp; Violet 151 or Surging Sparks.</p>
          </div>
          <form className="create-form" onSubmit={submit}>
            <label className="visually-hidden" htmlFor="set-name">Set name</label>
            <input
              id="set-name"
              type="text"
              required
              maxLength={200}
              placeholder="e.g. Scarlet & Violet 151"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <button className="primary-button" type="submit" disabled={busy}>
              {busy ? "Saving…" : "Add set"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>
          {error && <p className="form-error create-error" role="alert">{error}</p>}
        </section>

        <section className="set-list-section" aria-labelledby="list-heading">
          <div className="list-heading-row">
            <h2 id="list-heading">Your sets</h2>
            <span>{loading ? "Loading…" : `${sets.length} saved`}</span>
          </div>
          {loading ? (
            <div className="empty-state">Loading your sets…</div>
          ) : sets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-mark" aria-hidden="true">
                <span />
              </div>
              <h3>Your set list is ready</h3>
              <p>Add your first Pokémon set above. It will be saved to your account.</p>
            </div>
          ) : (
            <ul className="set-list">
              {sets.map((set, index) => (
                <li className="set-row" key={set.id}>
                  <span className={`set-symbol set-symbol-${index % 4}`} aria-hidden="true">
                    <span />
                  </span>
                  <span className="set-name">{set.name}</span>
                  <span className="set-created">
                    Added{" "}
                    {new Intl.DateTimeFormat(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(set.created_at))}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </section>

      <footer className="page-footer">
        <span>PokéVault</span>
        <span>Sets are private to your account.</span>
      </footer>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [sets, setSets] = useState<PokemonSet[]>([]);
  const [path, setPath] = useState(window.location.pathname);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loadingSets, setLoadingSets] = useState(false);
  const [loadError, setLoadError] = useState("");

  function navigate(nextPath: string, replace = false) {
    if (replace) window.history.replaceState({}, "", nextPath);
    else window.history.pushState({}, "", nextPath);
    setPath(nextPath);
  }

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let active = true;
    apiRequest<{ user: User | null }>("/api/auth/me")
      .then(({ user: currentUser }) => {
        if (active) {
          setUser(currentUser);
          const currentPath = window.location.pathname;
          if (currentUser && currentPath === "/") navigate("/sets", true);
          if (!currentUser && currentPath !== "/") navigate("/", true);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          if (window.location.pathname !== "/") navigate("/", true);
        }
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setSets([]);
      return;
    }
    let active = true;
    setLoadingSets(true);
    setLoadError("");
    apiRequest<{ sets: PokemonSet[] }>("/api/sets")
      .then(({ sets: ownedSets }) => {
        if (active) setSets(ownedSets);
      })
      .catch((cause) => {
        if (active) {
          setLoadError(cause instanceof Error ? cause.message : "Could not load sets.");
        }
      })
      .finally(() => {
        if (active) setLoadingSets(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  async function createSet(name: string) {
    const result = await apiRequest<{ set: PokemonSet }>("/api/sets", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    setSets((current) => [result.set, ...current]);
  }

  async function logout() {
    await apiRequest<void>("/api/auth/logout", { method: "POST" });
    setUser(null);
    setSets([]);
    navigate("/", true);
  }

  if (checkingSession) {
    return <main className="loading-screen"><Brand /><span>Opening your PokéVault…</span></main>;
  }

  if (!user) {
    return (
      <AuthPage
        onSignedIn={(signedInUser) => {
          setUser(signedInUser);
          navigate("/sets", true);
        }}
      />
    );
  }

  return (
    <>
      {loadError && (
        <div className="global-error" role="alert">
          {loadError}
          <button type="button" onClick={() => window.location.reload()}>Retry</button>
        </div>
      )}
      {path === "/dashboard" ? (
        <Dashboard userEmail={user.email} onNavigate={navigate} onLogout={logout} />
      ) : path.startsWith("/cards") || path.startsWith("/wishlist") || path === "/favorites" ? (
        <CardWorkspace
          path={path}
          sets={sets}
          userEmail={user.email}
          onNavigate={navigate}
          onLogout={logout}
        />
      ) : (
        <SetsPage
          user={user}
          sets={sets}
          loading={loadingSets}
          onCreate={createSet}
          onNavigate={navigate}
          onLogout={logout}
        />
      )}
    </>
  );
}
