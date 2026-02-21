#!/bin/bash

# Script pour vérifier l'espace disque et nettoyer si nécessaire

set -e

echo "💾 Vérification de l'espace disque"
echo "==================================="
echo ""

# Vérifier l'espace disque
echo "📊 Espace disque disponible :"
df -h / | grep -E "Filesystem|/dev/" | awk '{print "  " $1 " : " $4 " disponible sur " $2 " (" $5 " utilisé)"}'

echo ""
echo "📁 Taille des dossiers dans tmp/academy :"
if [ -d "/var/www/nunaheritage/tmp/academy" ]; then
    du -sh /var/www/nunaheritage/tmp/academy/* 2>/dev/null | sort -h | while read size dir; do
        echo "  $size - $(basename $dir)"
    done
    
    total_size=$(du -sh /var/www/nunaheritage/tmp/academy 2>/dev/null | cut -f1)
    echo ""
    echo "  Total tmp/academy : $total_size"
else
    echo "  ✅ tmp/academy n'existe pas ou est vide"
fi

echo ""
echo "📦 Dossiers dans tmp/academy :"
if [ -d "/var/www/nunaheritage/tmp/academy" ]; then
    ls -lh /var/www/nunaheritage/tmp/academy/ | tail -n +2 | awk '{print "  " $9 " (" $5 ")"}'
else
    echo "  ✅ Aucun dossier"
fi

echo ""
echo "🔍 Vérification des dossiers copiés dans le container..."
docker exec nunaheritage-backend ls -lh /app/uploads/academy/ 2>/dev/null | tail -n +2 | awk '{print "  " $9 " (" $5 ")"}' || echo "  ⚠️  Impossible de vérifier"

echo ""
echo "💡 Pour libérer de l'espace :"
echo "  1. Si un dossier a été copié avec succès, vous pouvez le supprimer de tmp :"
echo "     rm -rf /var/www/nunaheritage/tmp/academy/[nom-du-dossier]"
echo ""
echo "  2. Vérifier les logs du script pour voir quels dossiers ont été copiés :"
echo "     Le script devrait avoir supprimé automatiquement les dossiers après copie"
echo ""
echo "  3. Si le script a échoué, vous pouvez supprimer manuellement les dossiers déjà copiés"
