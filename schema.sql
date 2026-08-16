-- Run this once in Neon before deploying the API.
CREATE TABLE IF NOT EXISTS water_sources (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120),
    type VARCHAR(120) NOT NULL,
    temp_status VARCHAR(20) NOT NULL CHECK (temp_status IN ('cold', 'normal', 'not_cold')),
    price_type VARCHAR(20) NOT NULL CHECK (price_type IN ('free', 'paid')),
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    photo_url TEXT,
    note TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE water_sources ADD COLUMN IF NOT EXISTS country VARCHAR(120);
ALTER TABLE water_sources ADD COLUMN IF NOT EXISTS province VARCHAR(120);
ALTER TABLE water_sources ADD COLUMN IF NOT EXISTS note TEXT;

CREATE INDEX IF NOT EXISTS water_sources_country_province_idx
    ON water_sources (country, province);

CREATE INDEX IF NOT EXISTS water_sources_status_created_at_idx
    ON water_sources (status, created_at DESC);

CREATE INDEX IF NOT EXISTS water_sources_coordinates_idx
    ON water_sources (latitude, longitude);

CREATE TABLE IF NOT EXISTS site_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(40) NOT NULL CHECK (event_type IN ('visit', 'source_view', 'source_add', 'map_interaction', 'nearest_click')),
    session_id VARCHAR(80),
    source_id BIGINT REFERENCES water_sources(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS site_events_type_created_at_idx
    ON site_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS site_events_session_created_at_idx
    ON site_events (session_id, created_at DESC);


CREATE TABLE IF NOT EXISTS player_profiles (
    player_id VARCHAR(80) PRIMARY KEY,
    points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE water_sources ADD COLUMN IF NOT EXISTS player_id VARCHAR(80);
ALTER TABLE water_sources ADD COLUMN IF NOT EXISTS points_awarded INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS water_sources_player_id_idx
    ON water_sources (player_id, created_at DESC);

CREATE INDEX IF NOT EXISTS player_profiles_points_idx
    ON player_profiles (points DESC);


-- Optional Google accounts and secure sessions
CREATE TABLE IF NOT EXISTS app_users (
    id BIGSERIAL PRIMARY KEY,
    google_sub VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(320) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    avatar_url TEXT,
    points INTEGER NOT NULL DEFAULT 0,
    legacy_player_id VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_users_legacy_player_idx ON app_users (legacy_player_id);
CREATE INDEX IF NOT EXISTS auth_sessions_user_id_idx ON auth_sessions (user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions (expires_at);

ALTER TABLE water_sources ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS water_sources_user_id_idx ON water_sources (user_id, created_at DESC);
