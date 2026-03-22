-- User badges (gamification) — Academy completion series first, extensible by badge_code
CREATE TABLE IF NOT EXISTS user_badge (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "badgeCode" VARCHAR(64) NOT NULL,
  "earnedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_user_badge_user_code UNIQUE ("userId", "badgeCode")
);

CREATE INDEX IF NOT EXISTS idx_user_badge_user_id ON user_badge ("userId");
