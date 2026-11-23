CREATE TABLE IF NOT EXISTS event_participations (
  id bigserial PRIMARY KEY,
  event_id text NOT NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  participation text NOT NULL
    CHECK (participation IN ('Donate items', 'Volunteer', 'Both')),
  donated_items text[] NOT NULL DEFAULT ARRAY[]::text[],
  dropoff_day text,
  dropoff_time text,
  quantity integer,
  notes text,
  consented_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_participations_event_created_idx
  ON event_participations (event_id, created_at DESC);
