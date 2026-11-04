CREATE TABLE IF NOT EXISTS sets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT sets_user_name_unique UNIQUE (user_id, name),
  CONSTRAINT sets_id_user_id_unique UNIQUE (id, user_id)
);

CREATE TABLE IF NOT EXISTS cards (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  set_id UUID NOT NULL,
  name TEXT NOT NULL,
  card_number TEXT,
  condition TEXT,
  purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  acquired_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'owned',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT cards_purchase_price_nonnegative CHECK (purchase_price >= 0),
  CONSTRAINT cards_status_valid CHECK (status IN ('owned', 'wishlist')),
  CONSTRAINT cards_id_user_id_unique UNIQUE (id, user_id),
  CONSTRAINT cards_set_owner_fkey
    FOREIGN KEY (set_id, user_id)
    REFERENCES sets (id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS cards_user_set_idx
  ON cards (user_id, set_id);

CREATE TABLE IF NOT EXISTS stars (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  card_id UUID NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT stars_user_card_unique UNIQUE (user_id, card_id),
  CONSTRAINT stars_card_owner_fkey
    FOREIGN KEY (card_id, user_id)
    REFERENCES cards (id, user_id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS stars_user_idx
  ON stars (user_id);
