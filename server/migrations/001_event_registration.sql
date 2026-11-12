CREATE TABLE IF NOT EXISTS event_sessions (
  event_id text NOT NULL,
  session_date date NOT NULL,
  capacity integer NOT NULL CHECK (capacity > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, session_date)
);

CREATE TABLE IF NOT EXISTS event_interests (
  id bigserial PRIMARY KEY,
  event_id text NOT NULL,
  email text NOT NULL,
  subscribed boolean NOT NULL DEFAULT true,
  confirmed boolean NOT NULL DEFAULT false,
  consented_at timestamptz NOT NULL DEFAULT now(),
  unsubscribe_token_hash char(64) NOT NULL UNIQUE,
  confirmation_expires_at timestamptz NOT NULL
    DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS event_interests_subscribed_idx
  ON event_interests (event_id, subscribed, confirmed, created_at DESC);

CREATE TABLE IF NOT EXISTS event_registrations (
  id bigserial PRIMARY KEY,
  registration_ref text NOT NULL UNIQUE,
  idempotency_key text NOT NULL UNIQUE,
  event_id text NOT NULL,
  session_date date NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  total_amount_cents integer NOT NULL CHECK (total_amount_cents > 0),
  refunded_amount_cents integer NOT NULL DEFAULT 0
    CHECK (
      refunded_amount_cents >= 0
      AND refunded_amount_cents <= total_amount_cents
    ),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending', 'paid', 'failed', 'expired', 'partially_refunded',
      'refunded', 'disputed', 'dispute_won', 'dispute_lost'
    )),
  stripe_checkout_session_id text UNIQUE,
  stripe_payment_intent_id text,
  stripe_live_mode boolean NOT NULL,
  expires_at timestamptz NOT NULL,
  paid_at timestamptz,
  confirmation_email_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (event_id, session_date)
    REFERENCES event_sessions (event_id, session_date)
);

CREATE INDEX IF NOT EXISTS event_registrations_session_status_idx
  ON event_registrations (event_id, session_date, status, expires_at);

CREATE INDEX IF NOT EXISTS event_registrations_created_idx
  ON event_registrations (created_at DESC);
