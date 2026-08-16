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
