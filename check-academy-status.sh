#!/bin/bash

# Script pour vérifier l'état des copies de l'académie

echo "🔍 Vérification de l'état des copies de l'académie"
echo "=================================================="
echo ""

# Vérifier les dossiers dans /tmp/academy
echo "📁 Dossiers dans /tmp/academy :"
if [ -d "/tmp/academy" ]; then
    du -sh /tmp/academy/* 2>/dev/null | sort -h | while read size dir; do
        echo "  $size - $(basename $dir)"
    done
    total_size=$(du -sh /tmp/academy 2>/dev/null | cut -f1)
    echo "  Total : $total_size"
else
    echo "  ✅ /tmp/academy n'existe pas ou est vide"
fi

echo ""
echo "📦 Dossiers copiés dans le container :"
CONTAINER_NAME="nunaheritage-backend"

if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker exec "$CONTAINER_NAME" ls -lh /app/uploads/academy/ 2>/dev/null | tail -n +2 | while read line; do
        if echo "$line" | grep -q "^d"; then
            dir_name=$(echo "$line" | awk '{print $9}')
            dir_size=$(docker exec "$CONTAINER_NAME" du -sh "/app/uploads/academy/$dir_name" 2>/dev/null | cut -f1)
            echo "  📁 $dir_name ($dir_size)"
        fi
    done
else
    echo "  ⚠️  Container $CONTAINER_NAME n'est pas en cours d'exécution"
fi

echo ""
echo "💡 Pour continuer la copie après nettoyage Docker :"
echo "   1. ./cleanup-docker.sh"
echo "   2. ./copy-academy-videos.sh"
