-- Témoignages vidéo (membres) + limite mensuelle Pūpū sur users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS "lastTestimonialPupuAt" TIMESTAMP NULL;

CREATE TABLE IF NOT EXISTS testimonial_submissions (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  subject VARCHAR(32) NOT NULL,
  "partnerId" INTEGER NULL,
  "listingId" INTEGER NULL,
  "videoUrl" VARCHAR(512) NOT NULL,
  "durationSeconds" INTEGER NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  "reviewedAt" TIMESTAMP NULL,
  "reviewedById" INTEGER NULL,
  "rejectionReason" TEXT NULL,
  "pupuGranted" BOOLEAN NOT NULL DEFAULT false,
  "pupuAmount" DECIMAL(10, 2) NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT "FK_testimonial_user"
    FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT "FK_testimonial_partner"
    FOREIGN KEY ("partnerId") REFERENCES partners(id) ON DELETE SET NULL,
  CONSTRAINT "FK_testimonial_listing"
    FOREIGN KEY ("listingId") REFERENCES listings(id) ON DELETE SET NULL,
  CONSTRAINT "FK_testimonial_reviewer"
    FOREIGN KEY ("reviewedById") REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "IDX_testimonial_submissions_userId"
  ON testimonial_submissions("userId");

CREATE INDEX IF NOT EXISTS "IDX_testimonial_submissions_status"
  ON testimonial_submissions(status);
