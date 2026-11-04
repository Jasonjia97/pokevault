import { useEffect, useState, type FormEvent } from "react";
import {
  validateCardValues,
  type CardValidationErrors,
  type CardValidationField,
} from "./cardValidation";
import { downloadCardsCsv } from "./csvDownload";
import { ThemeToggle } from "./ThemeToggle";
import type { Theme } from "./themePreference";

export type PokemonCard = {
  id: string;
  set_id: string;
  set_name: string;
  name: string;
  card_number: string | null;
  condition: string | null;
  purchase_price: string;
  acquired_date: string | null;
  notes: string | null;
  status: "owned" | "wishlist";
  created_at: string;
  is_starred: boolean;
};

export type CardSet = {
  id: string;
  name: string;
};

async function apiRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options?.headers },
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

type CardValues = {
  set_id: string;
  name: string;
  card_number: string;
  condition: string;
  purchase_price: string;
  acquired_date: string;
  notes: string;
  status: "owned" | "wishlist";
};

const emptyCard: CardValues = {
  set_id: "",
  name: "",
  card_number: "",
  condition: "",
  purchase_price: "0.00",
  acquired_date: "",
  notes: "",
  status: "owned",
};

function CardForm({
  card,
  sets,
  initialStatus = "owned",
  onCancel,
  onSave,
}: {
  card?: PokemonCard;
  sets: CardSet[];
  initialStatus?: "owned" | "wishlist";
  onCancel: () => void;
  onSave: (values: CardValues) => Promise<void>;
}) {
  const [values, setValues] = useState<CardValues>(
    card
      ? {
          set_id: card.set_id,
          name: card.name,
          card_number: card.card_number ?? "",
          condition: card.condition ?? "",
          purchase_price: card.purchase_price,
          acquired_date: card.acquired_date ?? "",
          notes: card.notes ?? "",
          status: card.status,
        }
      : { ...emptyCard, set_id: sets[0]?.id ?? "", status: initialStatus },
  );
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CardValidationErrors>({});
  const [busy, setBusy] = useState(false);

  function change(field: keyof CardValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[field as CardValidationField];
      return next;
    });
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const validationErrors = validateCardValues(values, sets);
    setFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setBusy(true);
    try {
      await onSave(values);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save this card.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card-editor" aria-labelledby="card-form-heading">
      <div className="card-page-heading">
        <span className="eyebrow">{card ? "EDIT CARD" : "NEW CARD"}</span>
        <h1 id="card-form-heading">{card ? "Update card details" : "Add a card"}</h1>
      </div>
      {sets.length === 0 ? (
        <div className="empty-state">
          <h2>Create a set first</h2>
          <p>Cards need to belong to one of your Pokémon sets.</p>
          <button className="secondary-button" onClick={onCancel}>Back to cards</button>
        </div>
      ) : (
        <form className="card-form" onSubmit={submit} noValidate>
          <label htmlFor="card-name">Card name</label>
          <input
            id="card-name"
            required
            maxLength={200}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? "card-name-error" : undefined}
            value={values.name}
            onChange={(event) => change("name", event.target.value)}
          />
          {fieldErrors.name && <p className="field-error" id="card-name-error" role="alert">{fieldErrors.name}</p>}

          <label htmlFor="card-set">Set</label>
          <select
            id="card-set"
            required
            aria-invalid={Boolean(fieldErrors.set_id)}
            aria-describedby={fieldErrors.set_id ? "card-set-error" : undefined}
            value={values.set_id}
            onChange={(event) => change("set_id", event.target.value)}
          >
            <option value="">Choose a set</option>
            {sets.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}
          </select>
          {fieldErrors.set_id && <p className="field-error" id="card-set-error" role="alert">{fieldErrors.set_id}</p>}

          <div className="card-form-grid">
            <div>
              <label htmlFor="card-number">Card number</label>
              <input
                id="card-number"
                maxLength={40}
                value={values.card_number}
                onChange={(event) => change("card_number", event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label htmlFor="card-condition">Condition</label>
              <input
                id="card-condition"
                maxLength={80}
                value={values.condition}
                onChange={(event) => change("condition", event.target.value)}
                placeholder="Optional"
              />
            </div>
            <div>
              <label htmlFor="card-price">Purchase price</label>
              <input
                id="card-price"
                type="number"
                min="0"
                max="99999999.99"
                step="0.01"
                aria-invalid={Boolean(fieldErrors.purchase_price)}
                aria-describedby={fieldErrors.purchase_price ? "card-price-error" : undefined}
                value={values.purchase_price}
                onChange={(event) => change("purchase_price", event.target.value)}
              />
              {fieldErrors.purchase_price && <p className="field-error" id="card-price-error" role="alert">{fieldErrors.purchase_price}</p>}
            </div>
            <div>
              <label htmlFor="card-date">Acquisition date</label>
              <input
                id="card-date"
                type="date"
                value={values.acquired_date}
                onChange={(event) => change("acquired_date", event.target.value)}
              />
            </div>
          </div>

          <label htmlFor="card-status">Collection status</label>
          <select
            id="card-status"
            value={values.status}
            onChange={(event) => change("status", event.target.value as CardValues["status"])}
          >
            <option value="owned">Owned</option>
            <option value="wishlist">Wishlist</option>
          </select>

          <label htmlFor="card-notes">Notes</label>
          <textarea
            id="card-notes"
            maxLength={4000}
            rows={4}
            value={values.notes}
            onChange={(event) => change("notes", event.target.value)}
            placeholder="Optional details about this card"
          />
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="card-form-actions">
            <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
            <button className="primary-button" disabled={busy}>
              {busy ? "Saving…" : card ? "Save changes" : "Add card"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export function CardWorkspace({
  path,
  sets,
  userEmail,
  onNavigate,
  onLogout,
  theme,
  onToggleTheme,
}: {
  path: string;
  sets: CardSet[];
  userEmail: string;
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
  theme: Theme;
  onToggleTheme: () => void;
}) {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [card, setCard] = useState<PokemonCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [setFilter, setSetFilter] = useState("");
  const [sort, setSort] = useState("added_desc");
  const idMatch = path.match(/^\/cards\/([^/]+)(?:\/(edit))?$/);
  const isNew = path === "/cards/new" || path === "/wishlist/new";
  const isList = path === "/cards";
  const isFavorites = path === "/favorites";
  const isWishlist = path === "/wishlist";
  const cardId = idMatch?.[1];
  const isEdit = idMatch?.[2] === "edit";
  const filterParams = new URLSearchParams({ sort });
  if (search.trim()) filterParams.set("search", search.trim());
  if (setFilter) filterParams.set("set_id", setFilter);
  if (isWishlist) filterParams.set("status", "wishlist");
  else if (isList) filterParams.set("status", "owned");
  const filterQuery = filterParams.toString();

  useEffect(() => {
    let active = true;
    setError("");
    setLoading(true);
    setCard(null);

    const load = isList || isFavorites || isWishlist
      ? apiRequest<{ cards: PokemonCard[] }>(
          `${isFavorites ? "/api/cards/favorites" : "/api/cards"}?${filterQuery}`,
        ).then(({ cards: result }) => {
          if (active) setCards(result);
        })
      : cardId
        ? apiRequest<{ card: PokemonCard }>(`/api/cards/${encodeURIComponent(cardId)}`)
            .then(({ card: result }) => {
              if (active) setCard(result);
            })
        : Promise.resolve();

    load
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load cards.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [path, isList, isFavorites, isWishlist, cardId, filterQuery]);

  async function save(values: CardValues) {
    const editing = Boolean(card && isEdit);
    const result = await apiRequest<{ card: PokemonCard }>(
      editing ? `/api/cards/${card!.id}` : "/api/cards",
      {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          set_id: values.set_id,
          name: values.name,
          card_number: values.card_number,
          condition: values.condition,
          purchase_price: values.purchase_price,
          acquired_date: values.acquired_date,
          notes: values.notes,
          status: values.status,
        }),
      },
    );
    onNavigate(`/cards/${result.card.id}`);
  }

  async function moveToOwned(target: PokemonCard) {
    try {
      const result = await apiRequest<{ card: PokemonCard }>(
        `/api/cards/${target.id}/status`,
        { method: "PATCH", body: JSON.stringify({ status: "owned" }) },
      );
      setCard((current) => current?.id === target.id ? result.card : current);
      setCards((current) => isWishlist
        ? current.filter((item) => item.id !== target.id)
        : current.map((item) => item.id === target.id ? result.card : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not move this card to owned.");
    }
  }

  async function downloadCsv() {
    setError("");
    try {
      await downloadCardsCsv();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The CSV download could not be completed.");
    }
  }

  async function deleteCard() {
    if (!card || !window.confirm(`Delete “${card.name}”? This cannot be undone.`)) return;
    try {
      await apiRequest<void>(`/api/cards/${card.id}`, { method: "DELETE" });
      onNavigate("/cards");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete this card.");
    }
  }

  async function toggleStar(target: PokemonCard) {
    const nextStarred = !target.is_starred;
    try {
      await apiRequest<{ starred: boolean }>(`/api/cards/${target.id}/star`, {
        method: nextStarred ? "POST" : "DELETE",
      });
      setCard((current) =>
        current?.id === target.id ? { ...current, is_starred: nextStarred } : current,
      );
      setCards((current) =>
        isFavorites && !nextStarred
          ? current.filter((item) => item.id !== target.id)
          : current.map((item) =>
              item.id === target.id ? { ...item, is_starred: nextStarred } : item,
            ),
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update favorites.");
    }
  }

  return (
    <main className="sets-layout">
      <header className="topbar">
        <a className="brand" href="/sets" onClick={(event) => {
          event.preventDefault();
          onNavigate("/sets");
        }} aria-label="PokéVault home">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span>Poké<span>Vault</span></span>
        </a>
        <div className="account-controls">
          <span className="account-email">{userEmail}</span>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          <button className="secondary-button" type="button" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <section className="cards-main">
        <nav className="cards-nav" aria-label="Collection navigation">
          <button className="text-button" onClick={() => onNavigate("/sets")}>← Sets</button>
          <span aria-hidden="true">/</span>
          <button className="text-button" onClick={() => onNavigate("/cards")}>Cards</button>
          <button className="text-button" onClick={() => onNavigate("/wishlist")}>Wishlist</button>
          <button className="text-button" onClick={() => onNavigate("/dashboard")}>Dashboard</button>
          <span aria-hidden="true">/</span>
          {isFavorites ? <span>Favorites</span> : isWishlist ? <span>Wishlist</span> : (
            <button
              className="text-button"
              onClick={() => onNavigate(path.startsWith("/wishlist") ? "/wishlist" : "/favorites")}
            >
              {path.startsWith("/wishlist") ? "Wishlist" : "Favorites"}
            </button>
          )}
        </nav>

        {isNew ? (
          <CardForm
            sets={sets}
            initialStatus={path === "/wishlist/new" ? "wishlist" : "owned"}
            onCancel={() => onNavigate(path === "/wishlist/new" ? "/wishlist" : "/cards")}
            onSave={save}
          />
        ) : isEdit ? (
          loading ? <div className="empty-state">Loading card…</div> : card ? (
            <CardForm
              card={card}
              sets={sets}
              onCancel={() => onNavigate(`/cards/${card.id}`)}
              onSave={save}
            />
          ) : <div className="empty-state">{error || "Card not found."}</div>
        ) : isList || isFavorites || isWishlist ? (
          <section className="cards-list-page">
            <div className="card-page-heading">
              <div>
                <span className="eyebrow">
                  {isFavorites ? "YOUR FAVORITES" : isWishlist ? "CARDS TO FIND" : "YOUR COLLECTION"}
                </span>
                <h1>{isFavorites ? "Favorite cards" : isWishlist ? "Wishlist" : "Your cards"}</h1>
                <p>
                  {isFavorites
                    ? "Cards you have starred for quick access."
                    : isWishlist
                      ? "Cards you hope to buy, kept separate from the cards you own."
                      : "Keep the details of the cards you collect."}
                </p>
              </div>
              {!isFavorites && (
                <div className="card-form-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => void downloadCsv()}
                  >
                    Download CSV
                  </button>
                  <button
                    className="primary-button"
                    onClick={() => onNavigate(isWishlist ? "/wishlist/new" : "/cards/new")}
                  >
                    ＋ {isWishlist ? "Add a wishlist card" : "Add a card"}
                  </button>
                </div>
              )}
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            <div className="card-filters" aria-label="Find and sort cards">
              <label>
                Search by card name
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search cards"
                />
              </label>
              <label>
                Pokémon set
                <select value={setFilter} onChange={(event) => setSetFilter(event.target.value)}>
                  <option value="">All sets</option>
                  {sets.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}
                </select>
              </label>
              <label>
                Sort by
                <select value={sort} onChange={(event) => setSort(event.target.value)}>
                  <option value="added_desc">Recently added</option>
                  <option value="price_desc">Price: high to low</option>
                  <option value="price_asc">Price: low to high</option>
                  <option value="date_desc">Acquisition date: newest</option>
                  <option value="date_asc">Acquisition date: oldest</option>
                </select>
              </label>
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setSearch("");
                  setSetFilter("");
                  setSort("added_desc");
                }}
              >
                Clear filters
              </button>
            </div>
            {loading ? <div className="empty-state">Loading cards…</div> : cards.length === 0 ? (
              <div className="empty-state">
                <h2>
                  {isFavorites ? "No favorites yet" : isWishlist ? "Your wishlist is empty" : "No owned cards yet"}
                </h2>
                <p>
                  {isFavorites
                    ? "Star a card to see it here."
                    : isWishlist
                      ? "Add cards you hope to buy and keep them separate from your collection."
                      : "Add an owned card to one of your sets to start your collection."}
                </p>
                {!isFavorites && (
                  <button
                    className="primary-button"
                    onClick={() => onNavigate(isWishlist ? "/wishlist/new" : "/cards/new")}
                  >
                    {isWishlist ? "Add your first wishlist card" : "Add your first card"}
                  </button>
                )}
              </div>
            ) : (
              <ul className="card-list">
                {cards.map((item) => (
                  <li key={item.id} className="card-list-item">
                    <button className="card-list-open" onClick={() => onNavigate(`/cards/${item.id}`)}>
                      <span className="card-name">{item.name}</span>
                      <span>{item.set_name}{item.card_number ? ` · #${item.card_number}` : ""}</span>
                      <span>${Number(item.purchase_price).toFixed(2)}</span>
                      <span className={`card-status-badge status-${item.status}`}>
                        {item.status === "wishlist" ? "Wishlist" : "Owned"}
                      </span>
                    </button>
                    {isWishlist && (
                      <button
                        className="secondary-button wishlist-own-button"
                        type="button"
                        onClick={() => void moveToOwned(item)}
                      >
                        Move to owned
                      </button>
                    )}
                    <button
                      className="star-button"
                      type="button"
                      aria-label={item.is_starred ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
                      aria-pressed={item.is_starred}
                      onClick={() => void toggleStar(item)}
                    >
                      {item.is_starred ? "★" : "☆"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          loading ? <div className="empty-state">Loading card…</div> : card ? (
            <article className="card-detail">
              <div className="card-page-heading">
                <div>
                  <span className="eyebrow">CARD DETAILS</span>
                  <h1>{card.name}</h1>
                  <p>{card.set_name}{card.card_number ? ` · #${card.card_number}` : ""}</p>
                </div>
                <div className="card-form-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    aria-pressed={card.is_starred}
                    onClick={() => void toggleStar(card)}
                  >
                    {card.is_starred ? "★ Remove favorite" : "☆ Add to favorites"}
                  </button>
                  {card.status === "wishlist" && (
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => void moveToOwned(card)}
                    >
                      Move to owned
                    </button>
                  )}
                  <button className="secondary-button" onClick={() => onNavigate(`/cards/${card.id}/edit`)}>Edit card</button>
                  <button className="danger-button" onClick={deleteCard}>Delete card</button>
                </div>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <dl className="card-details-grid">
                <div><dt>Condition</dt><dd>{card.condition || "Not specified"}</dd></div>
                <div><dt>Purchase price</dt><dd>${Number(card.purchase_price).toFixed(2)}</dd></div>
                <div><dt>Acquired</dt><dd>{card.acquired_date || "Not specified"}</dd></div>
                <div><dt>Status</dt><dd>{card.status === "wishlist" ? "Wishlist" : "Owned"}</dd></div>
                <div><dt>Notes</dt><dd>{card.notes || "No notes"}</dd></div>
              </dl>
            </article>
          ) : <div className="empty-state">{error || "Card not found."}</div>
        )}
      </section>
      <footer className="page-footer"><span>PokéVault</span><span>Cards are private to your account.</span></footer>
    </main>
  );
}
