import { useEffect, useState, type FormEvent } from "react";

type User = {
  id: string;
  email: string;
};

type AuthMode = "signup" | "login";

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    credentials: "same-origin",
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(body?.error ?? "We couldn't complete that request.");
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={`brand${compact ? " brand-compact" : ""}`}
      href="/"
      aria-label="PokéVault home"
    >
      <span className="brand-mark" aria-hidden="true">
        <span />
      </span>
      <span>
        Poké<span>Vault</span>
      </span>
    </a>
  );
}

function Landing({
  onAuthenticated,
}: {
  onAuthenticated: (user: User) => void;
}) {
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
      const result = await request<{ user: User }>(`/api/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onAuthenticated(result.user);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError("");
  }

  return (
    <main className="landing">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="site-header">
        <Brand />
        <button
          className="text-button header-link"
          onClick={() => switchMode(mode === "signup" ? "login" : "signup")}
        >
          {mode === "signup" ? "Already have an account?" : "New to PokéVault?"}
          <span>{mode === "signup" ? " Sign in" : " Create an account"}</span>
        </button>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            A calmer home for your collection
          </div>
          <h1>
            Keep your
            <br />
            favorites <span>close.</span>
          </h1>
          <p className="hero-description">
            Your Pokémon cards deserve a place of their own. Start with a
            private vault, made just for you.
          </p>
          <div className="hero-note">
            <span className="note-check" aria-hidden="true">✓</span>
            Your collection is private to your account
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="orbit orbit-outer" />
            <div className="orbit orbit-inner" />
            <div className="spark spark-one">✦</div>
            <div className="spark spark-two">✧</div>
            <div className="spark spark-three">·</div>
            <div className="vault-orb">
              <div className="orb-ring" />
              <div className="orb-core" />
              <span className="orb-shine" />
            </div>
            <div className="art-caption">
              <span>YOUR COLLECTION</span>
              <span className="caption-line" />
              <span>STARTS HERE</span>
            </div>
          </div>
        </div>

        <div className="auth-card">
          <div className="form-heading">
            <div className="form-kicker">
              {mode === "signup" ? "YOUR PERSONAL VAULT" : "WELCOME BACK"}
            </div>
            <h2>{mode === "signup" ? "Create your account" : "Sign in"}</h2>
            <p>
              {mode === "signup"
                ? "A little space for everything you love."
                : "Your collection is waiting for you."}
            </p>
          </div>

          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
            />
            <div className="password-label">
              <label htmlFor="password">Password</label>
              {mode === "login" && <span>At least 8 characters</span>}
            </div>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder="8 characters or more"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              maxLength={72}
            />
            {error && (
              <p className="form-error" role="alert">
                <span aria-hidden="true">!</span>
                {error}
              </p>
            )}
            <button className="primary-button" type="submit" disabled={busy}>
              {busy
                ? "One moment…"
                : mode === "signup"
                  ? "Create my vault"
                  : "Sign in to PokéVault"}
              {!busy && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="form-divider">
            <span />
            <span>or</span>
            <span />
          </div>
          <p className="form-switch">
            {mode === "signup" ? "Already have an account?" : "New to PokéVault?"}{" "}
            <button
              type="button"
              className="inline-button"
              onClick={() => switchMode(mode === "signup" ? "login" : "signup")}
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
          <p className="privacy-note">
            <span aria-hidden="true">⌑</span> Your account is yours alone. Always.
          </p>
        </div>
      </section>

      <footer className="site-footer">
        <span>PokéVault</span>
        <span className="footer-dot">·</span>
        <span>Made for the cards you love</span>
        <span className="footer-year">A little corner of your own</span>
      </footer>
    </main>
  );
}

function Home({
  user,
  onLogout,
}: {
  user: User;
  onLogout: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await onLogout();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="home">
      <header className="home-header">
        <Brand compact />
        <div className="account-controls">
          <span className="account-email">{user.email}</span>
          <button className="logout-button" onClick={logout} disabled={busy}>
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>
      <section className="home-content">
        <div className="welcome-label">
          <span className="welcome-dot" />
          YOUR PRIVATE POKÉVAULT
        </div>
        <h1>
          Welcome in,
          <br />
          <span>{user.email.split("@")[0]}.</span>
        </h1>
        <p className="home-intro">
          This is your space. Your PokéVault account is ready whenever you are.
        </p>
        <div className="empty-vault">
          <div className="empty-symbol" aria-hidden="true">
            <span className="empty-ring" />
            <span className="empty-spark">✦</span>
          </div>
          <div>
            <h2>Your vault is ready</h2>
            <p>
              You’re signed in. Collection tools will arrive in a later step.
            </p>
          </div>
        </div>
        <div className="home-footnote">
          <span className="note-check" aria-hidden="true">✓</span>
          Only you can access this account
        </div>
      </section>
      <div className="home-decoration" aria-hidden="true">
        <div className="decoration-orbit" />
        <div className="decoration-orb">
          <span />
        </div>
        <span className="decoration-star">✦</span>
      </div>
      <footer className="home-footer">
        <span>PokéVault</span>
        <span>Keep your favorites close.</span>
      </footer>
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    request<{ user: User | null }>("/api/auth/me")
      .then((result) => {
        if (active) {
          setUser(result.user);
          window.history.replaceState({}, "", result.user ? "/app" : "/");
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          window.history.replaceState({}, "", "/");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    await request<void>("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.history.replaceState({}, "", "/");
  }

  if (loading) {
    return (
      <main className="loading-screen">
        <Brand />
        <span>Opening your vault…</span>
      </main>
    );
  }

  return user ? (
    <Home user={user} onLogout={logout} />
  ) : (
    <Landing
      onAuthenticated={(authenticatedUser) => {
        setUser(authenticatedUser);
        window.history.replaceState({}, "", "/app");
      }}
    />
  );
}
