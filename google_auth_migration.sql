-- تشغيل هذا الملف مرة واحدة في Neon SQL Editor قبل نشر OAuth.

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

-- بعد تسجيل أول دخول، يمكن دمج اللاعب المحلي القديم يدويًا أو من خلال زر الربط.
