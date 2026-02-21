#!/bin/bash

# Script pour vérifier les erreurs du backend

echo "🔍 Vérification des erreurs backend"
echo "===================================="
echo ""

echo "1️⃣  Dernières lignes des logs (erreurs possibles)..."
docker logs --tail 50 nunaheritage-backend 2>&1 | grep -i -E "error|exception|failed|timeout|cannot|unable" | tail -20

echo ""
echo "2️⃣  Vérification si le backend démarre correctement..."
if docker logs nunaheritage-backend 2>&1 | grep -q "Application is running"; then
    echo "✅ Backend semble démarré"
else
    echo "❌ Backend ne semble pas démarré correctement"
    echo ""
    echo "Dernières 30 lignes des logs :"
    docker logs --tail 30 nunaheritage-backend
fi

echo ""
echo "3️⃣  Vérification de l'erreur fileUrl (colonne manquante)..."
if docker logs nunaheritage-backend 2>&1 | grep -qi "fileUrl"; then
    echo "⚠️  Erreur fileUrl détectée dans les logs"
    docker logs nunaheritage-backend 2>&1 | grep -i "fileUrl" | tail -5
    echo ""
    echo "💡 Solution : Exécuter la migration fileUrl"
    echo "   docker exec -w /app nunaheritage-backend npm run migrate:fileurl-goodies"
else
    echo "✅ Pas d'erreur fileUrl visible"
fi

echo ""
echo "4️⃣  Vérification de la connexion à la base de données..."
if docker logs nunaheritage-backend 2>&1 | grep -qi -E "database|postgres|connection|connect"; then
    docker logs nunaheritage-backend 2>&1 | grep -i -E "database|postgres|connection|connect" | tail -5
fi

echo ""
echo "5️⃣  État du container..."
docker ps --filter "name=nunaheritage-backend" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "✅ Diagnostic terminé"
