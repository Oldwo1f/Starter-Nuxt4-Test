#!/bin/bash

# Script pour renommer les fichiers vidéo de la formation Charisme dans le volume Docker
# Enlève le # dans le nom des fichiers de manière récursive dans uploads/academy/charisme
#
# Usage:
#   ./fix-charisme-video-files.sh          # Mode interactif (demande confirmation)
#   ./fix-charisme-video-files.sh --yes    # Mode non-interactif (pas de confirmation)

set -u

# Vérifier si le mode non-interactif est activé
NON_INTERACTIVE=false
if [ "$1" = "--yes" ] || [ "$1" = "-y" ]; then
    NON_INTERACTIVE=true
fi

echo "🔧 Renommage des fichiers vidéo Charisme dans le volume Docker"
echo "=============================================================="
echo ""

# Vérifier que le container backend est en cours d'exécution
if ! docker ps --format '{{.Names}}' | grep -q "^nunaheritage-backend$"; then
    echo "❌ Le container nunaheritage-backend n'est pas en cours d'exécution"
    exit 1
fi

CONTAINER_NAME="nunaheritage-backend"
BASE_PATH="/app/uploads/academy/charisme"

echo "📁 Chemin de base: $BASE_PATH"
echo ""

# Vérifier que le dossier existe
if ! docker exec "$CONTAINER_NAME" test -d "$BASE_PATH" 2>/dev/null; then
    echo "❌ Le dossier $BASE_PATH n'existe pas dans le container"
    exit 1
fi

echo "🔍 Recherche des fichiers contenant '#'..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Lister tous les fichiers contenant un # dans leur nom
FILES_WITH_HASH=$(docker exec "$CONTAINER_NAME" find "$BASE_PATH" -type f -name '*#*' 2>/dev/null || true)

if [ -z "$FILES_WITH_HASH" ]; then
    echo "✅ Aucun fichier contenant '#' trouvé. Rien à faire."
    exit 0
fi

# Compter les fichiers
FILE_COUNT=$(echo "$FILES_WITH_HASH" | grep -v '^$' | wc -l)
echo "📊 $FILE_COUNT fichier(s) trouvé(s) contenant '#'"
echo ""

# Afficher les fichiers avant renommage
echo "📋 Fichiers à renommer:"
echo "$FILES_WITH_HASH" | while read -r file; do
    if [ -n "$file" ]; then
        filename=$(basename "$file")
        echo "  - $file"
    fi
done

if [ "$NON_INTERACTIVE" = false ]; then
    echo ""
    read -p "⚠️  Voulez-vous continuer avec le renommage? (oui/non): " confirm
    if [ "$confirm" != "oui" ] && [ "$confirm" != "o" ] && [ "$confirm" != "O" ] && [ "$confirm" != "OUI" ]; then
        echo "❌ Opération annulée"
        exit 0
    fi
else
    echo ""
    echo "⚠️  Mode non-interactif activé, renommage en cours..."
fi

echo ""
echo "🔧 Renommage des fichiers..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Créer un script de renommage dans le container
# Cela évite tous les problèmes d'échappement
docker exec "$CONTAINER_NAME" bash -c 'cat > /tmp/rename_all.sh << '\''SCRIPT_EOF'\''
#!/bin/bash
BASE_PATH="/app/uploads/academy/charisme"
RENAMED=0
ERROR=0

find "$BASE_PATH" -type f -name "*#*" | while IFS= read -r file; do
    if [ -n "$file" ]; then
        dir=$(dirname "$file")
        filename=$(basename "$file")
        new_filename=$(echo "$filename" | tr -d "#")
        new_path="$dir/$new_filename"
        
        if [ -f "$new_path" ]; then
            echo "EXISTS:$file"
        elif mv "$file" "$new_path" 2>/dev/null; then
            echo "SUCCESS:$file"
        else
            echo "ERROR:$file"
        fi
    fi
done
SCRIPT_EOF
chmod +x /tmp/rename_all.sh
' > /dev/null 2>&1 || true

# Exécuter le script de renommage
RENAME_OUTPUT=$(docker exec "$CONTAINER_NAME" /tmp/rename_all.sh 2>&1 || true)

RENAMED_COUNT=0
ERROR_COUNT=0
EXISTS_COUNT=0

# Traiter les résultats
while IFS= read -r line; do
    if [ -z "$line" ]; then
        continue
    fi
    
    if echo "$line" | grep -q "^SUCCESS:"; then
        file=$(echo "$line" | sed 's/^SUCCESS://')
        filename=$(basename "$file")
        new_filename=$(echo "$filename" | tr -d '#')
        echo "  ✅ $filename → $new_filename"
        RENAMED_COUNT=$((RENAMED_COUNT + 1))
    elif echo "$line" | grep -q "^EXISTS:"; then
        file=$(echo "$line" | sed 's/^EXISTS://')
        filename=$(basename "$file")
        new_filename=$(echo "$filename" | tr -d '#')
        echo "  ⚠️  $filename → $new_filename (déjà existe, ignoré)"
        EXISTS_COUNT=$((EXISTS_COUNT + 1))
    elif echo "$line" | grep -q "^ERROR:"; then
        file=$(echo "$line" | sed 's/^ERROR://')
        filename=$(basename "$file")
        echo "  ❌ Erreur lors du renommage de: $filename"
        ERROR_COUNT=$((ERROR_COUNT + 1))
    fi
done <<< "$RENAME_OUTPUT"

# Nettoyer le script temporaire
docker exec "$CONTAINER_NAME" rm -f /tmp/rename_all.sh 2>/dev/null || true

echo ""
echo "✅ Renommage terminé!"
echo "   - $RENAMED_COUNT fichier(s) renommé(s)"
if [ $ERROR_COUNT -gt 0 ]; then
    echo "   - $ERROR_COUNT fichier(s) avec erreur(s)"
fi

echo ""
echo "🔍 Vérification finale..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Vérifier qu'il ne reste plus de fichiers avec #
REMAINING_FILES=$(docker exec "$CONTAINER_NAME" find "$BASE_PATH" -type f -name '*#*' 2>/dev/null || true)

if [ -z "$REMAINING_FILES" ]; then
    echo "✅ Aucun fichier contenant '#' restant. Tous les fichiers ont été renommés."
else
    echo "⚠️  Fichiers restants contenant '#' :"
    echo "$REMAINING_FILES" | while read -r file; do
        if [ -n "$file" ]; then
            echo "  - $file"
        fi
    done
fi

echo ""
echo "✅ Script terminé!"
