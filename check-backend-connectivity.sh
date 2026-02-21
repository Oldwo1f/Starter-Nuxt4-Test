#!/bin/bash

# Script pour diagnostiquer les problèmes de connectivité backend

echo "🔍 Diagnostic de connectivité backend"
echo "======================================"
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

echo "1️⃣  Vérification des containers..."
$DOCKER_COMPOSE_CMD ps

echo ""
echo "2️⃣  Vérification que le backend écoute sur le port 8081..."
docker exec nunaheritage-backend netstat -tlnp 2>/dev/null | grep 8081 || docker exec nunaheritage-backend ss -tlnp 2>/dev/null | grep 8081 || echo "⚠️  Impossible de vérifier le port (netstat/ss non disponible)"

echo ""
echo "3️⃣  Test de connectivité depuis le container backend vers lui-même..."
docker exec nunaheritage-backend wget -q -O- http://localhost:8081 2>&1 | head -5 || docker exec nunaheritage-backend curl -s http://localhost:8081 | head -5 || echo "⚠️  wget/curl non disponible"

echo ""
echo "4️⃣  Test depuis Traefik network..."
docker run --rm --network traefik-network curlimages/curl:latest curl -s -m 5 http://nunaheritage-backend:8081 2>&1 | head -10 || echo "⚠️  Test depuis réseau Traefik échoué"

echo ""
echo "5️⃣  Dernières lignes des logs backend..."
docker logs --tail 20 nunaheritage-backend

echo ""
echo "6️⃣  Vérification des variables d'environnement..."
docker exec nunaheritage-backend env | grep -E "PORT|NODE_ENV|DB_HOST"

echo ""
echo "✅ Diagnostic terminé"
