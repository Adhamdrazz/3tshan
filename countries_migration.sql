-- Run this once in Neon SQL Editor after deploying the API changes.
ALTER TABLE water_sources ADD COLUMN IF NOT EXISTS country VARCHAR(120);
ALTER TABLE water_sources ADD COLUMN IF NOT EXISTS province VARCHAR(120);

CREATE INDEX IF NOT EXISTS water_sources_country_province_idx
    ON water_sources (country, province);

-- Existing sources currently stored in this project are in Egypt / Asyut.
UPDATE water_sources
SET country = 'مصر', province = 'أسيوط'
WHERE id IN (1, 2, 3)
  AND country IS NULL;
