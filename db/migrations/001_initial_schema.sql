CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT,
  cover_image_alt TEXT,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published', 'scheduled', 'archived')),
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  reading_time_minutes INTEGER NOT NULL CHECK (reading_time_minutes >= 1),
  word_count INTEGER NOT NULL CHECK (word_count >= 0),
  category TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  seo_title TEXT,
  seo_description TEXT,
  footnotes JSONB NOT NULL DEFAULT '[]'::jsonb,
  views_count BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX posts_publication_idx ON posts (status, published_at DESC);
CREATE INDEX posts_category_idx ON posts (category);
CREATE INDEX posts_scheduled_idx ON posts (scheduled_at) WHERE status = 'scheduled';

CREATE TABLE media (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT '',
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE site_settings (
  singleton SMALLINT PRIMARY KEY DEFAULT 1 CHECK (singleton = 1),
  payload JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL
);

CREATE INDEX activity_logs_created_idx ON activity_logs (created_at DESC);

CREATE TABLE admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX admin_sessions_expiry_idx ON admin_sessions (expires_at);
