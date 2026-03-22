-- Single-row configuration for public launch / coming-soon mode
CREATE TABLE IF NOT EXISTS launch_mode_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  enabled BOOLEAN NOT NULL DEFAULT false,
  "allowedIps" JSONB NOT NULL DEFAULT '[]'::jsonb,
  "launchOpensAt" TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT launch_mode_config_single_row CHECK (id = 1)
);

INSERT INTO launch_mode_config (id, enabled, "allowedIps", "launchOpensAt")
VALUES (1, false, '[]'::jsonb, NOW() + INTERVAL '7 days')
ON CONFLICT (id) DO NOTHING;
