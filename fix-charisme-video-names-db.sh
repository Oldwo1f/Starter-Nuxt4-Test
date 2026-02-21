#!/bin/bash

# Script pour modifier les liens des vidéos de la formation Charisme dans la DB
# Enlève le # dans le nom du fichier dans les chemins stockés en base de données

set -e

echo "🔧 Modification des liens des vidéos Charisme dans la base de données"
echo "======================================================================"
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

# Afficher les vidéos avant modification
echo "📋 Vidéos de la formation Charisme (avant modification):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" << 'EOF'
SELECT 
    v.id,
    m.title as module,
    v.title as video_title,
    v."videoFile" as current_path
FROM videos v
JOIN "academy_modules" m ON v."moduleId" = m.id
JOIN courses c ON m."courseId" = c.id
WHERE c.title = 'Charisme' AND v."videoFile" IS NOT NULL AND v."videoFile" LIKE '%#%'
ORDER BY m."order", v."order";
EOF

echo ""
echo "🔧 Modification des chemins (enlèvement du #)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Mettre à jour les chemins dans la base de données
UPDATED_COUNT=$(docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" -t -c "
SELECT COUNT(*) 
FROM videos v
JOIN \"academy_modules\" m ON v.\"moduleId\" = m.id
JOIN courses c ON m.\"courseId\" = c.id
WHERE c.title = 'Charisme' 
  AND v.\"videoFile\" IS NOT NULL 
  AND v.\"videoFile\" LIKE '%#%';
" | tr -d ' ')

if [ "$UPDATED_COUNT" -gt 0 ]; then
    docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" << 'EOF'
-- Mettre à jour les chemins des vidéos de la formation Charisme
-- Enlever le # dans le nom du fichier
UPDATE videos v
SET "videoFile" = REPLACE(v."videoFile", '#', '')
FROM "academy_modules" m, courses c
WHERE v."moduleId" = m.id
  AND m."courseId" = c.id
  AND c.title = 'Charisme'
  AND v."videoFile" IS NOT NULL
  AND v."videoFile" LIKE '%#%';

SELECT 'Mise à jour effectuée' as result;
EOF
    echo ""
    echo "✅ $UPDATED_COUNT vidéo(s) mise(s) à jour dans la base de données"
else
    echo "ℹ️  Aucune vidéo à modifier (toutes les vidéos n'ont déjà plus de # dans leur nom)"
fi

# Vérifier les résultats
echo ""
echo "📋 Vidéos de la formation Charisme (après modification):"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" << 'EOF'
SELECT 
    v.id,
    m.title as module,
    v.title as video_title,
    v."videoFile" as updated_path
FROM videos v
JOIN "academy_modules" m ON v."moduleId" = m.id
JOIN courses c ON m."courseId" = c.id
WHERE c.title = 'Charisme' AND v."videoFile" IS NOT NULL
ORDER BY m."order", v."order";
EOF

echo ""
echo "✅ Modification des liens dans la base de données terminée!"
echo ""
echo "⚠️  IMPORTANT: Assurez-vous d'exécuter aussi le script fix-charisme-video-files.sh"
echo "   pour renommer les fichiers physiques dans le volume Docker."
