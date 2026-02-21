#!/bin/bash

# Script pour vérifier en détail les vidéos de Charisme

set -e

echo "🔍 Vérification détaillée des vidéos Charisme"
echo "=============================================="
echo ""

CONTAINER_NAME="nunaheritage-backend"

# Charger les variables d'environnement
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

DB_USERNAME=${DB_USERNAME:-postgres}
DB_NAME=${DB_NAME:-nunaheritage}

echo "1️⃣  Structure des dossiers dans le container..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec "$CONTAINER_NAME" find /app/uploads/academy/charisme -type d 2>/dev/null | sort || echo "❌ Dossier charisme non trouvé"

echo ""
echo "2️⃣  Liste de TOUS les fichiers dans charisme..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec "$CONTAINER_NAME" find /app/uploads/academy/charisme -type f 2>/dev/null | while read file; do
    size=$(docker exec "$CONTAINER_NAME" stat -c%s "$file" 2>/dev/null | numfmt --to=iec-i --suffix=B 2>/dev/null || echo "?")
    echo "  $file ($size)"
done || echo "⚠️  Aucun fichier trouvé"

echo ""
echo "3️⃣  Chemins dans la base de données pour Charisme..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" << 'EOF'
SELECT 
    m."order" as module_order,
    m.title as module,
    v."order" as video_order,
    v.title as video_title,
    v."videoFile" as path_in_db
FROM videos v
JOIN "academy_modules" m ON v."moduleId" = m.id
JOIN courses c ON m."courseId" = c.id
WHERE c.title = 'Charisme'
ORDER BY m."order", v."order";
EOF

echo ""
echo "4️⃣  Vérification fichier par fichier..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Récupérer tous les chemins depuis la DB et vérifier
docker exec -i nunaheritage-postgres psql -U "$DB_USERNAME" -d "$DB_NAME" -t -c "SELECT v.\"videoFile\" FROM videos v JOIN \"academy_modules\" m ON v.\"moduleId\" = m.id JOIN courses c ON m.\"courseId\" = c.id WHERE c.title = 'Charisme' ORDER BY m.\"order\", v.\"order\";" | while read db_path; do
    db_path=$(echo "$db_path" | tr -d ' ')
    if [ -n "$db_path" ]; then
        # Convertir le chemin DB en chemin système
        system_path=$(echo "$db_path" | sed 's|^/uploads|/app/uploads|')
        
        # Vérifier si le fichier existe
        if docker exec "$CONTAINER_NAME" test -f "$system_path" 2>/dev/null; then
            size=$(docker exec "$CONTAINER_NAME" stat -c%s "$system_path" 2>/dev/null | numfmt --to=iec-i --suffix=B 2>/dev/null || echo "?")
            echo "  ✅ $db_path ($size)"
        else
            echo "  ❌ $db_path (NON TROUVÉ)"
            
            # Chercher des fichiers similaires
            filename=$(basename "$system_path")
            echo "     Recherche de fichiers similaires..."
            docker exec "$CONTAINER_NAME" find /app/uploads/academy/charisme -name "*${filename:0:10}*" 2>/dev/null | head -2 | while read similar; do
                echo "     → Trouvé: $similar"
            done || echo "     → Aucun fichier similaire trouvé"
        fi
    fi
done

echo ""
echo "5️⃣  Exemple de problème détecté..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Dans l'URL de l'erreur, on voit :"
echo "  /uploads/academy/charisme/module%201/%231-2%20Test%20charisme%20VF.mp4"
echo ""
echo "Le problème peut être :"
echo "  1. Les espaces dans 'module 1' sont encodés en %20"
echo "  2. Le # dans le nom de fichier est encodé en %23"
echo "  3. Le serveur ne décode peut-être pas correctement les URLs"
echo ""
echo "Vérification du fichier réel..."
test_path="/app/uploads/academy/charisme/module 1/#1-2 Test charisme VF.mp4"
if docker exec "$CONTAINER_NAME" test -f "$test_path" 2>/dev/null; then
    echo "  ✅ Le fichier existe avec le nom exact (espaces et #)"
else
    echo "  ❌ Le fichier n'existe pas avec ce nom exact"
    echo "  Recherche de variantes..."
    docker exec "$CONTAINER_NAME" find /app/uploads/academy/charisme -name "*1-2*" -o -name "*Test*charisme*" 2>/dev/null | head -3
fi

echo ""
echo "✅ Vérification terminée"
