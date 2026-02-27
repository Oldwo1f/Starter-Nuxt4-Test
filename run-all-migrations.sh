#!/bin/bash

# Script pour exécuter toutes les migrations nécessaires

set -e

# Couleurs pour les messages
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔄 Exécution des migrations nécessaires..."
echo "=========================================="
echo ""

# Détecter docker-compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

# Vérifier que le container postgres est en cours d'exécution
if ! docker ps --format '{{.Names}}' | grep -q "^nunaheritage-postgres$"; then
    echo "❌ Le container nunaheritage-postgres n'est pas en cours d'exécution"
    exit 1
fi

# Charger les variables d'environnement si .env existe
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Valeurs par défaut
DB_USERNAME=${DB_USERNAME:-postgres}
DB_NAME=${DB_NAME:-nunaheritage}

echo "📊 Connexion à la base de données: $DB_NAME"
echo ""

# Migration 1: Ajouter fileUrl à goodies
echo "1️⃣  Migration: Ajout de la colonne fileUrl à la table goodies..."
docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" << 'EOF'
-- Migration: Add fileUrl column to goodies table
ALTER TABLE goodies ADD COLUMN IF NOT EXISTS "fileUrl" VARCHAR NULL;
COMMENT ON COLUMN goodies."fileUrl" IS 'URL du fichier uploadé (zip, pdf, etc.). Si défini, prend la priorité sur le champ link.';
SELECT 'Colonne fileUrl ajoutée à goodies' AS result;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Migration fileUrl terminée"
else
    echo "❌ Erreur lors de la migration fileUrl"
    exit 1
fi

echo ""

# Migration 2: Créer la table courses si elle n'existe pas
echo "2️⃣  Migration: Création de la table courses si elle n'existe pas..."
docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" << 'EOF'
-- Migration: Create courses table if it doesn't exist
CREATE TABLE IF NOT EXISTS "courses" (
    "id" SERIAL PRIMARY KEY,
    "title" VARCHAR NOT NULL,
    "description" TEXT,
    "thumbnailImage" VARCHAR,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "instructorAvatar" VARCHAR,
    "instructorFirstName" VARCHAR,
    "instructorLastName" VARCHAR,
    "instructorTitle" VARCHAR,
    "instructorLink" VARCHAR,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
SELECT 'Table courses créée ou déjà existante' AS result;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Table courses créée/vérifiée"
else
    echo "❌ Erreur lors de la création de la table courses"
    exit 1
fi

echo ""

# Migration 3: Créer la table academy_modules si elle n'existe pas
echo "3️⃣  Migration: Création de la table academy_modules si elle n'existe pas..."
docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" << 'EOF'
-- Migration: Create academy_modules table if it doesn't exist
CREATE TABLE IF NOT EXISTS "academy_modules" (
    "id" SERIAL PRIMARY KEY,
    "courseId" INTEGER NOT NULL,
    "title" VARCHAR NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FK_academy_modules_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IDX_academy_modules_courseId" ON "academy_modules"("courseId");
SELECT 'Table academy_modules créée ou déjà existante' AS result;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Table academy_modules créée/vérifiée"
else
    echo "❌ Erreur lors de la création de la table academy_modules"
    exit 1
fi

echo ""

# Migration 4: Créer la table videos si elle n'existe pas
echo "4️⃣  Migration: Création de la table videos si elle n'existe pas..."
docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" << 'EOF'
-- Migration: Create videos table if it doesn't exist
CREATE TABLE IF NOT EXISTS "videos" (
    "id" SERIAL PRIMARY KEY,
    "moduleId" INTEGER NOT NULL,
    "title" VARCHAR NOT NULL,
    "description" TEXT,
    "videoFile" VARCHAR,
    "videoUrl" VARCHAR,
    "duration" INTEGER,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FK_videos_module" FOREIGN KEY ("moduleId") REFERENCES "academy_modules"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "IDX_videos_moduleId" ON "videos"("moduleId");
SELECT 'Table videos créée ou déjà existante' AS result;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Table videos créée/vérifiée"
else
    echo "❌ Erreur lors de la création de la table videos"
    exit 1
fi

echo ""

# Migration 5: Créer la table course_progress si elle n'existe pas
echo "5️⃣  Migration: Création de la table course_progress si elle n'existe pas..."
docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" << 'EOF'
-- Migration: Create course_progress table if it doesn't exist
CREATE TABLE IF NOT EXISTS "course_progress" (
    "id" SERIAL PRIMARY KEY,
    "userId" INTEGER NOT NULL,
    "courseId" INTEGER NOT NULL,
    "completedVideos" INTEGER[] DEFAULT '{}',
    "lastVideoWatchedId" INTEGER NULL,
    "progressPercentage" DECIMAL(5,2) DEFAULT 0,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FK_course_progress_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
    CONSTRAINT "FK_course_progress_course" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE,
    CONSTRAINT "UQ_course_progress_user_course" UNIQUE ("userId", "courseId")
);
CREATE INDEX IF NOT EXISTS "IDX_course_progress_userId" ON "course_progress"("userId");
CREATE INDEX IF NOT EXISTS "IDX_course_progress_courseId" ON "course_progress"("courseId");
SELECT 'Table course_progress créée ou déjà existante' AS result;
EOF

if [ $? -eq 0 ]; then
    echo "✅ Table course_progress créée/vérifiée"
else
    echo "❌ Erreur lors de la création de la table course_progress"
    exit 1
fi

echo ""

# Migration 6: accessLevel dans goodies (remplace isPublic)
echo "6️⃣  Migration: accessLevel dans goodies (remplace isPublic)..."
if docker ps | grep -q "^nunaheritage-backend$"; then
    echo "   Exécution via le conteneur backend..."
    docker exec -i nunaheritage-backend npm run migrate:access-level 2>&1 | grep -v "^$" || {
        echo -e "${YELLOW}⚠️  Migration access-level: peut être déjà appliquée ou erreur mineure${NC}"
    }
else
    echo "   Exécution directe SQL..."
    docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" -f /dev/stdin << 'EOF'
-- Migration: Update goodies table to use accessLevel instead of isPublic
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'goodies' AND column_name = 'isPublic'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'goodies' AND column_name = 'accessLevel'
    ) THEN
      ALTER TABLE goodies ADD COLUMN "accessLevel" VARCHAR(20) DEFAULT 'public';
      UPDATE goodies SET "accessLevel" = CASE 
        WHEN "isPublic" = true THEN 'public'
        WHEN "isPublic" = false THEN 'member'
        ELSE 'public'
      END;
      ALTER TABLE goodies ALTER COLUMN "accessLevel" SET NOT NULL;
      ALTER TABLE goodies ALTER COLUMN "accessLevel" SET DEFAULT 'public';
      DROP INDEX IF EXISTS "IDX_goodies_isPublic";
      ALTER TABLE goodies DROP COLUMN "isPublic";
    END IF;
  ELSE
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns WHERE table_name = 'goodies' AND column_name = 'accessLevel'
    ) THEN
      ALTER TABLE goodies ADD COLUMN "accessLevel" VARCHAR(20) DEFAULT 'public' NOT NULL;
    END IF;
  END IF;
END $$;
ALTER TABLE goodies DROP CONSTRAINT IF EXISTS "CHK_goodies_accessLevel";
ALTER TABLE goodies ADD CONSTRAINT "CHK_goodies_accessLevel" 
  CHECK ("accessLevel" IN ('public', 'member', 'premium', 'vip'));
DROP INDEX IF EXISTS "IDX_goodies_accessLevel";
CREATE INDEX "IDX_goodies_accessLevel" ON goodies("accessLevel");
EOF
fi

if [ $? -eq 0 ]; then
    echo "✅ Migration accessLevel dans goodies terminée"
else
    echo "⚠️  Migration accessLevel dans goodies: vérifiez manuellement"
fi

echo ""

# Migration 7: accessLevel dans courses
echo "7️⃣  Migration: accessLevel dans courses..."
if docker ps | grep -q "^nunaheritage-backend$"; then
    echo "   Exécution via le conteneur backend..."
    docker exec -i nunaheritage-backend npm run migrate:access-level-courses 2>&1 | grep -v "^$" || {
        echo -e "${YELLOW}⚠️  Migration access-level-courses: peut être déjà appliquée ou erreur mineure${NC}"
    }
else
    echo "   Exécution directe SQL..."
    docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" -f /dev/stdin << 'EOF'
ALTER TABLE courses ADD COLUMN IF NOT EXISTS "accessLevel" VARCHAR(20) DEFAULT 'public';
ALTER TABLE courses ALTER COLUMN "accessLevel" SET NOT NULL;
ALTER TABLE courses ALTER COLUMN "accessLevel" SET DEFAULT 'public';
ALTER TABLE courses DROP CONSTRAINT IF EXISTS "CHK_courses_accessLevel";
ALTER TABLE courses ADD CONSTRAINT "CHK_courses_accessLevel" 
  CHECK ("accessLevel" IN ('public', 'member', 'premium', 'vip'));
CREATE INDEX IF NOT EXISTS "IDX_courses_accessLevel" ON courses("accessLevel");
EOF
fi

if [ $? -eq 0 ]; then
    echo "✅ Migration accessLevel dans courses terminée"
else
    echo "⚠️  Migration accessLevel dans courses: vérifiez manuellement"
fi

echo ""

# Migration 8: paidAccessExpiresAt dans users et bank_transfer_payments
echo "8️⃣  Migration: paidAccessExpiresAt dans users et table bank_transfer_payments..."
if docker ps | grep -q "^nunaheritage-backend$"; then
    echo "   Exécution via le conteneur backend..."
    docker exec -i nunaheritage-backend npm run migrate:bank-transfer-payments 2>&1 | grep -v "^$" || {
        echo -e "${YELLOW}⚠️  Migration bank-transfer-payments: peut être déjà appliquée ou erreur mineure${NC}"
    }
else
    echo "   Exécution directe SQL..."
    # Copier le fichier SQL dans le conteneur temporairement ou l'exécuter directement
    if [ -f "backend/migrations/add_paid_access_and_bank_transfer_payments.sql" ]; then
        docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" < backend/migrations/add_paid_access_and_bank_transfer_payments.sql
    else
        echo "⚠️  Fichier SQL non trouvé, exécution manuelle requise"
    fi
fi

if [ $? -eq 0 ]; then
    echo "✅ Migration paidAccessExpiresAt et bank_transfer_payments terminée"
else
    echo "⚠️  Migration paidAccessExpiresAt et bank_transfer_payments: vérifiez manuellement"
fi

echo ""
echo "✅ Toutes les migrations ont été exécutées!"
echo ""
echo "Vérification des tables créées..."
docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" -c "\dt" | grep -E "courses|academy_modules|videos|course_progress|goodies|bank_transfer_payments" || echo "⚠️  Impossible de lister les tables"
