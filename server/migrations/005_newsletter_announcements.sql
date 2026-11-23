CREATE TABLE IF NOT EXISTS newsletter_announcements (
  id bigserial PRIMARY KEY,
  title text NOT NULL,
  category text NOT NULL,
  subject text NOT NULL,
  preview_text text NOT NULL DEFAULT '',
  heading text NOT NULL,
  message text NOT NULL,
  event_date date,
  event_time text,
  featured_image_url text,
  button_text text,
  destination_url text,
  closing_message text,
  audience text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'sending', 'sent', 'failed')),
  idempotency_key text NOT NULL UNIQUE,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS newsletter_announcement_sends (
  id bigserial PRIMARY KEY,
  announcement_id bigint NOT NULL
    REFERENCES newsletter_announcements (id) ON DELETE CASCADE,
  subscriber_id bigint NOT NULL
    REFERENCES newsletter_subscribers (id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  provider_message_id text,
  error_code text,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (announcement_id, subscriber_id)
);
