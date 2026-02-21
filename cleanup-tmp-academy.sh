#!/bin/bash

# Script pour nettoyer manuellement les dossiers de tmp/academy après vérification

set -e

echo "🧹 Nettoyage de tmp/academy"
echo "==========================="
echo ""

TMP_DIR="/var/www/nunaheritage/tmp/academy"

if [ ! -d "$TMP_DIR" ]; then
    echo "✅ Le dossier $TMP_DIR n'existe pas - rien à nettoyer"
    exit 0
fi

# Lister les dossiers
echo "📁 Dossiers trouvés dans tmp/academy :"
folders=()
i=1
for folder in "$TMP_DIR"/*; do
    if [ -d "$folder" ]; then
        folder_name=$(basename "$folder")
        folder_size=$(du -sh "$folder" 2>/dev/null | cut -f1)
        folders+=("$folder")
        echo "  $i. $folder_name ($folder_size)"
        i=$((i + 1))
    fi
done

if [ ${#folders[@]} -eq 0 ]; then
    echo "  ✅ Aucun dossier à nettoyer"
    exit 0
fi

echo ""
echo "🔍 Vérification des dossiers copiés dans le container..."
CONTAINER_NAME="nunaheritage-backend"

for folder_path in "${folders[@]}"; do
    folder_name=$(basename "$folder_path")
    
    # Vérifier si le dossier existe dans le container
    if docker exec "$CONTAINER_NAME" test -d "/app/uploads/academy/$folder_name" 2>/dev/null; then
        echo "  ✅ $folder_name : Copié dans le container"
        echo "     → Peut être supprimé de tmp"
    else
        echo "  ⚠️  $folder_name : Non trouvé dans le container"
        echo "     → Ne PAS supprimer (copie peut avoir échoué)"
    fi
done

echo ""
read -p "Voulez-vous supprimer les dossiers qui ont été copiés ? (o/N) : " -n 1 -r
echo ""

if [[ $REPLY =~ ^[OoYy]$ ]]; then
    deleted=0
    for folder_path in "${folders[@]}"; do
        folder_name=$(basename "$folder_path")
        
        # Vérifier si le dossier existe dans le container avant de supprimer
        if docker exec "$CONTAINER_NAME" test -d "/app/uploads/academy/$folder_name" 2>/dev/null; then
            echo "🗑️  Suppression de $folder_name..."
            if rm -rf "$folder_path"; then
                echo "  ✅ Supprimé"
                deleted=$((deleted + 1))
            else
                echo "  ❌ Erreur lors de la suppression"
            fi
        else
            echo "⏭️  $folder_name : Non supprimé (non trouvé dans le container)"
        fi
    done
    
    echo ""
    echo "✅ $deleted dossier(s) supprimé(s)"
else
    echo "❌ Suppression annulée"
fi
