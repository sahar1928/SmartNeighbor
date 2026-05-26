CREATE TABLE buildings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  units INTEGER NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  monthly_fee_cents INTEGER NOT NULL DEFAULT 0,
  collection_rate INTEGER NOT NULL DEFAULT 0,
  emergency_fund_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE residents (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  name TEXT NOT NULL,
  apartment TEXT NOT NULL,
  floor INTEGER,
  role TEXT NOT NULL CHECK (role IN ('resident', 'committee', 'chair', 'provider_admin')),
  phone TEXT,
  email TEXT,
  access_token_hash TEXT,
  consent_ai_processing BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE providers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT NOT NULL,
  phone TEXT NOT NULL,
  rating NUMERIC(2, 1) NOT NULL DEFAULT 0,
  avg_response_hours INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  resident_id TEXT NOT NULL REFERENCES residents(id),
  amount_cents INTEGER NOT NULL,
  method TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'late', 'failed')),
  provider_transaction_id TEXT,
  provider_reference TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resident_charges (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  resident_id TEXT NOT NULL REFERENCES residents(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'paid', 'void')),
  due_date DATE NOT NULL,
  category TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resident_ledger (
  id TEXT PRIMARY KEY,
  resident_id TEXT NOT NULL REFERENCES residents(id),
  type TEXT NOT NULL CHECK (type IN ('charge', 'payment', 'adjustment')),
  title TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  provider_reference TEXT,
  posted_at DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE maintenance_tickets (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  reporter_id TEXT REFERENCES residents(id),
  provider_id TEXT REFERENCES providers(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  status TEXT NOT NULL CHECK (status IN ('open', 'assigned', 'in_progress', 'pending_approval', 'resolved', 'closed')),
  location TEXT,
  sla_hours INTEGER NOT NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE community_posts (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  author_id TEXT REFERENCES residents(id),
  channel TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  expires_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE library_items (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  owner_id TEXT NOT NULL REFERENCES residents(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('available', 'borrowed', 'unavailable')),
  max_days INTEGER NOT NULL DEFAULT 3,
  loans_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE votes (
  id TEXT PRIMARY KEY,
  building_id TEXT NOT NULL REFERENCES buildings(id),
  title TEXT NOT NULL,
  quorum INTEGER NOT NULL,
  closes_at DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vote_options (
  id TEXT PRIMARY KEY,
  vote_id TEXT NOT NULL REFERENCES votes(id),
  label TEXT NOT NULL,
  votes_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
