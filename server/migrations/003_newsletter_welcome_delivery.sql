ALTER TABLE newsletter_delivery_attempts
  DROP CONSTRAINT IF EXISTS newsletter_delivery_attempts_template_key_check;

ALTER TABLE newsletter_delivery_attempts
  ADD CONSTRAINT newsletter_delivery_attempts_template_key_check
  CHECK (template_key IN ('confirmation', 'welcome', 'marketing'));

CREATE TABLE IF NOT EXISTS newsletter_unsubscribe_tokens (
  token_hash char(64) PRIMARY KEY,
  subscriber_id bigint NOT NULL
    REFERENCES newsletter_subscribers (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);
