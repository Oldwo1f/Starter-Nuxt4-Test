-- Premium lifetime (Umete one-time) + Stripe customer/subscription linkage
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "premiumLifetimeGrantedAt" TIMESTAMP NULL,
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS "stripeTeOhiSubscriptionId" VARCHAR(255) NULL;

COMMENT ON COLUMN "users"."premiumLifetimeGrantedAt" IS 'Set when Umete one-time payment is confirmed; premium tier persists if cotisation lapses';
COMMENT ON COLUMN "users"."stripeCustomerId" IS 'Stripe Customer id for subscriptions and payment history';
COMMENT ON COLUMN "users"."stripeTeOhiSubscriptionId" IS 'Active Te Ohi annual subscription (renews cotisation)';
