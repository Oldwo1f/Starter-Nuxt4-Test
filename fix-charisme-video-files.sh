#!/bin/bash

# Script pour renommer les fichiers vidéo de la formation Charisme dans le volume Docker
# Enlève le # dans le nom des fichiers de manière récursive dans uploads/academy/charisme
#
# Usage:
#   ./fix-charisme-video-files.sh          # Mode interactif (demande confirmation)
#   ./fix-charisme-video-files.sh --yes    # Mode non-interactif (pas de confirmation)

set -e

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

RENAMED_COUNT=0
ERROR_COUNT=0

# Renommer chaque fichier (sans pipe pour garder les variables dans le même shell)
# Utiliser bash -c avec des guillemets simples pour échapper correctement les chemins
while IFS= read -r file; do
    if [ -n "$file" ]; then
        # Obtenir le répertoire et le nom de fichier
        dir=$(dirname "$file")
        filename=$(basename "$file")
        
        # Créer le nouveau nom sans #
        new_filename=$(echo "$filename" | tr -d '#')
        new_path="$dir/$new_filename"
        
        # Utiliser bash -c avec des variables pour éviter les problèmes d'échappement
        # Passer les chemins via stdin pour éviter les problèmes avec les espaces
        RESULT=$(echo -e "$file\n$new_path" | docker exec -i "$CONTAINER_NAME" bash -c '
            IFS= read -r OLD_FILE
            IFS= read -r NEW_FILE
            if [ -f "$NEW_FILE" ]; then
                echo "EXISTS"
                exit 1
            fi
            if mv "$OLD_FILE" "$NEW_FILE" 2>/dev/null; then
                echo "SUCCESS"
                exit 0
            else
                echo "ERROR"
                exit 1
            fi
        ' 2>&1)
        EXIT_CODE=$?
        
        if [ $EXIT_CODE -eq 0 ] && echo "$RESULT" | grep -q "SUCCESS"; then
            echo "  ✅ $filename → $new_filename"
            RENAMED_COUNT=$((RENAMED_COUNT + 1))
        elif echo "$RESULT" | grep -q "EXISTS"; then
            echo "  ⚠️  $filename → $new_filename (déjà existe, ignoré)"
            ERROR_COUNT=$((ERROR_COUNT + 1))
        else
            echo "  ❌ Erreur lors du renommage de: $filename"
            if [ -n "$RESULT" ] && [ "$RESULT" != "ERROR" ]; then
                echo "     Détail: $RESULT"
            fi
            ERROR_COUNT=$((ERROR_COUNT + 1))
        fi
    fi
done <<< "$FILES_WITH_HASH"

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
