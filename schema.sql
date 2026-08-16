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

CREATE INDEX IF NOT EXISTS water_sources_status_created_at_idx
    ON water_sources (status, created_at DESC);

CREATE INDEX IF NOT EXISTS water_sources_coordinates_idx
    ON water_sources (latitude, longitude);
