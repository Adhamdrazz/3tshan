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
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE water_sources ADD COLUMN IF NOT EXISTS country VARCHAR(120);
ALTER TABLE water_sources ADD COLUMN IF NOT EXISTS province VARCHAR(120);

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
