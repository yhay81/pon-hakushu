PRAGMA foreign_keys = ON;

CREATE TABLE boxes (
  id TEXT PRIMARY KEY,
  owner_token_hash TEXT NOT NULL,
  creator_session_id TEXT NOT NULL,
  site_title TEXT NOT NULL CHECK (length(site_title) BETWEEN 1 AND 60),
  page_title TEXT NOT NULL CHECK (length(page_title) BETWEEN 1 AND 80),
  source_url TEXT NOT NULL CHECK (length(source_url) BETWEEN 8 AND 500),
  thank_you TEXT NOT NULL CHECK (length(thank_you) <= 120),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'hidden')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX boxes_expires_at ON boxes (expires_at);
CREATE INDEX boxes_creator ON boxes (creator_session_id, created_at);

CREATE TABLE reactions (
  box_id TEXT NOT NULL REFERENCES boxes(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('clap', 'more', 'thanks', 'useful')),
  occurred_on TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (box_id, session_id, occurred_on)
);

CREATE INDEX reactions_box ON reactions (box_id, created_at);

CREATE TABLE reports (
  box_id TEXT NOT NULL REFERENCES boxes(id) ON DELETE CASCADE,
  reporter_session_id TEXT NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'unsafe', 'other')),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (box_id, reporter_session_id)
);

CREATE TABLE product_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  name TEXT NOT NULL CHECK (
    name IN (
      'visited',
      'box_created',
      'link_copied',
      'reaction_saved',
      'owner_opened',
      'box_deleted',
      'returned'
    )
  ),
  context TEXT NOT NULL DEFAULT '',
  occurred_on TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (session_id, name, context, occurred_on)
);

CREATE INDEX product_events_created_at ON product_events (created_at);
