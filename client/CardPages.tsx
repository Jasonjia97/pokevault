import { useEffect, useState, type FormEvent } from "react";
import {
  validateCardValues,
  type CardValidationErrors,
  type CardValidationField,
} from "./cardValidation";

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
  created_at: string;
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
};

const emptyCard: CardValues = {
  set_id: "",
  name: "",
  card_number: "",
  condition: "",
  purchase_price: "0.00",
  acquired_date: "",
  notes: "",
};

function CardForm({
  card,
  sets,
  onCancel,
  onSave,
}: {
  card?: PokemonCard;
  sets: CardSet[];
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
        }
      : { ...emptyCard, set_id: sets[0]?.id ?? "" },
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
}: {
  path: string;
  sets: CardSet[];
  userEmail: string;
  onNavigate: (path: string) => void;
  onLogout: () => Promise<void>;
}) {
  const [cards, setCards] = useState<PokemonCard[]>([]);
  const [card, setCard] = useState<PokemonCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const idMatch = path.match(/^\/cards\/([^/]+)(?:\/(edit))?$/);
  const isNew = path === "/cards/new";
  const isList = path === "/cards";
  const cardId = idMatch?.[1];
  const isEdit = idMatch?.[2] === "edit";

  useEffect(() => {
    let active = true;
    setError("");
    setLoading(true);
    setCard(null);

    const load = isList
      ? apiRequest<{ cards: PokemonCard[] }>("/api/cards").then(({ cards: result }) => {
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
  }, [path, isList, cardId]);

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
        }),
      },
    );
    onNavigate(`/cards/${result.card.id}`);
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
          <button className="secondary-button" type="button" onClick={onLogout}>Sign out</button>
        </div>
      </header>

      <section className="cards-main">
        <nav className="cards-nav" aria-label="Collection navigation">
          <button className="text-button" onClick={() => onNavigate("/sets")}>← Sets</button>
          <span aria-hidden="true">/</span>
          {isList ? <span>Cards</span> : (
            <button className="text-button" onClick={() => onNavigate("/cards")}>Cards</button>
          )}
        </nav>

        {isNew ? (
          <CardForm sets={sets} onCancel={() => onNavigate("/cards")} onSave={save} />
        ) : isEdit ? (
          loading ? <div className="empty-state">Loading card…</div> : card ? (
            <CardForm card={card} sets={sets} onCancel={() => onNavigate(`/cards/${card.id}`)} onSave={save} />
          ) : <div className="empty-state">{error || "Card not found."}</div>
        ) : isList ? (
          <section className="cards-list-page">
            <div className="card-page-heading">
              <div>
                <span className="eyebrow">YOUR COLLECTION</span>
                <h1>Your cards</h1>
                <p>Keep the details of the cards you collect.</p>
              </div>
              <button className="primary-button" onClick={() => onNavigate("/cards/new")}>＋ Add a card</button>
            </div>
            {error && <p className="form-error" role="alert">{error}</p>}
            {loading ? <div className="empty-state">Loading cards…</div> : cards.length === 0 ? (
              <div className="empty-state">
                <h2>No cards yet</h2>
                <p>Add a card to one of your sets to start your collection.</p>
                <button className="primary-button" onClick={() => onNavigate("/cards/new")}>Add your first card</button>
              </div>
            ) : (
              <ul className="card-list">
                {cards.map((item) => (
                  <li key={item.id} className="card-list-item">
                    <button className="card-list-open" onClick={() => onNavigate(`/cards/${item.id}`)}>
                      <span className="card-name">{item.name}</span>
                      <span>{item.set_name}{item.card_number ? ` · #${item.card_number}` : ""}</span>
                      <span>${Number(item.purchase_price).toFixed(2)}</span>
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
                  <button className="secondary-button" onClick={() => onNavigate(`/cards/${card.id}/edit`)}>Edit card</button>
                  <button className="danger-button" onClick={deleteCard}>Delete card</button>
                </div>
              </div>
              {error && <p className="form-error" role="alert">{error}</p>}
              <dl className="card-details-grid">
                <div><dt>Condition</dt><dd>{card.condition || "Not specified"}</dd></div>
                <div><dt>Purchase price</dt><dd>${Number(card.purchase_price).toFixed(2)}</dd></div>
                <div><dt>Acquired</dt><dd>{card.acquired_date || "Not specified"}</dd></div>
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
