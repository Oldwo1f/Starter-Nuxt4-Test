#!/bin/bash

# Script pour vérifier les vidéos de l'académie

set -e

echo "🔍 Vérification des vidéos de l'académie"
echo "======================================="
echo ""

CONTAINER_NAME="nunaheritage-backend"

# Vérifier que le container est en cours d'exécution
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "❌ Le container ${CONTAINER_NAME} n'est pas en cours d'exécution"
    exit 1
fi

# Charger les variables d'environnement si .env existe
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_USERNAME=${DB_USERNAME:-postgres}
DB_NAME=${DB_NAME:-nunaheritage}

echo "1️⃣  Vérification des dossiers dans le container..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec "$CONTAINER_NAME" find /app/uploads/academy -type d -maxdepth 2 | sort

echo ""
echo "2️⃣  Vérification des vidéos de la formation Charisme..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Lister les vidéos de charisme dans le container
echo "📁 Structure des dossiers charisme :"
docker exec "$CONTAINER_NAME" find /app/uploads/academy/charisme -type d 2>/dev/null | sort || echo "⚠️  Dossier charisme non trouvé"

echo ""
echo "🎬 Fichiers vidéo trouvés dans charisme :"
docker exec "$CONTAINER_NAME" find /app/uploads/academy/charisme -type f -name "*.mp4" 2>/dev/null | while read file; do
    size=$(docker exec "$CONTAINER_NAME" stat -c%s "$file" 2>/dev/null | numfmt --to=iec-i --suffix=B 2>/dev/null || echo "?")
    echo "  $file ($size)"
done || echo "⚠️  Aucune vidéo trouvée"

echo ""
echo "3️⃣  Vérification des chemins dans la base de données..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Récupérer les chemins des vidéos de charisme depuis la DB
docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" << 'EOF' | tail -n +3
SELECT 
    m.title as module,
    v.title as video,
    v."videoFile" as path_in_db
FROM videos v
JOIN "academy_modules" m ON v."moduleId" = m.id
JOIN courses c ON m."courseId" = c.id
WHERE c.title = 'Charisme'
ORDER BY m."order", v."order"
LIMIT 20;
EOF

echo ""
echo "4️⃣  Comparaison des chemins..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Récupérer un exemple de chemin depuis la DB
db_path=$(docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" -t -c "SELECT v.\"videoFile\" FROM videos v JOIN \"academy_modules\" m ON v.\"moduleId\" = m.id JOIN courses c ON m.\"courseId\" = c.id WHERE c.title = 'Charisme' LIMIT 1;" | tr -d ' ')

if [ -n "$db_path" ]; then
    echo "Chemin dans la DB (exemple) : $db_path"
    
    # Convertir le chemin DB en chemin système
    system_path=$(echo "$db_path" | sed 's|^/uploads|/app/uploads|')
    echo "Chemin système attendu : $system_path"
    
    # Vérifier si le fichier existe
    if docker exec "$CONTAINER_NAME" test -f "$system_path" 2>/dev/null; then
        echo "✅ Fichier trouvé dans le container"
    else
        echo "❌ Fichier NON trouvé dans le container"
        echo ""
        echo "Recherche du fichier avec un nom similaire..."
        filename=$(basename "$system_path")
        docker exec "$CONTAINER_NAME" find /app/uploads/academy/charisme -name "*$(echo "$filename" | sed 's/.*#/#/')*" 2>/dev/null | head -3 || echo "  Aucun fichier similaire trouvé"
    fi
else
    echo "⚠️  Aucun chemin trouvé dans la base de données"
fi

echo ""
echo "5️⃣  Structure complète attendue pour Charisme..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Structure attendue selon les seeds :"
echo "  /app/uploads/academy/charisme/"
echo "    ├── introduction/"
echo "    ├── module 1/"
echo "    ├── module 2/"
echo "    ├── module 3/"
echo "    ├── module 4/"
echo "    ├── module 5/"
echo "    └── module 6/"

echo ""
echo "✅ Vérification terminée"
