-- Site banner configuration (singleton row pattern).
-- Table used by /banner endpoints.

CREATE TABLE IF NOT EXISTS site_banner_config (
  id INTEGER PRIMARY KEY,
  "desktopImageUrl" VARCHAR,
  "mobileImageUrl" VARCHAR,
  "isActive" BOOLEAN DEFAULT false,
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Ensure singleton row exists (id = 1)
INSERT INTO site_banner_config (id, "desktopImageUrl", "mobileImageUrl", "isActive")
VALUES (1, NULL, NULL, false)
ON CONFLICT (id) DO NOTHING;

