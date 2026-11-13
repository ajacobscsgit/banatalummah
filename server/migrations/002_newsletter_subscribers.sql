CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id bigserial PRIMARY KEY,
  email text NOT NULL UNIQUE,
  first_name text NOT NULL DEFAULT '',
  wants_upcoming_events boolean NOT NULL DEFAULT false,
  wants_arabic_classes boolean NOT NULL DEFAULT false,
  wants_general_updates boolean NOT NULL DEFAULT false,
  consented_at timestamptz NOT NULL DEFAULT now(),
  consent_version text NOT NULL DEFAULT 'newsletter-v1',
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'unsubscribed')),
  confirmation_token_hash char(64) UNIQUE,
  confirmation_expires_at timestamptz,
  unsubscribe_token_hash char(64) NOT NULL UNIQUE,
  confirmed_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    wants_upcoming_events OR wants_arabic_classes OR wants_general_updates
  ),
  CHECK (
    (status = 'pending' AND confirmation_token_hash IS NOT NULL
      AND confirmation_expires_at IS NOT NULL)
    OR (status <> 'pending' AND confirmation_token_hash IS NULL
      AND confirmation_expires_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_status_created_idx
  ON newsletter_subscribers (status, created_at DESC);

CREATE INDEX IF NOT EXISTS newsletter_subscribers_events_segment_idx
  ON newsletter_subscribers (created_at DESC)
  WHERE status = 'confirmed' AND wants_upcoming_events = true;

CREATE INDEX IF NOT EXISTS newsletter_subscribers_arabic_segment_idx
  ON newsletter_subscribers (created_at DESC)
  WHERE status = 'confirmed' AND wants_arabic_classes = true;

CREATE INDEX IF NOT EXISTS newsletter_subscribers_general_segment_idx
  ON newsletter_subscribers (created_at DESC)
  WHERE status = 'confirmed' AND wants_general_updates = true;

CREATE TABLE IF NOT EXISTS newsletter_delivery_attempts (
  id bigserial PRIMARY KEY,
  subscriber_id bigint NOT NULL
    REFERENCES newsletter_subscribers (id) ON DELETE CASCADE,
  template_key text NOT NULL
    CHECK (template_key IN ('confirmation', 'welcome', 'marketing')),
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  provider_message_id text,
  error_code text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (status = 'sent' AND error_code IS NULL)
    OR (status = 'failed' AND error_code IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS newsletter_delivery_attempts_status_idx
  ON newsletter_delivery_attempts (status, attempted_at DESC);
