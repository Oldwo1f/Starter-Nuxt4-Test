#!/bin/bash

echo "🔍 Vérification des conteneurs qui fonctionnent avec Traefik"
echo ""

# Vérifier les conteneurs perfectgeneration qui fonctionnent
echo "1. Labels Traefik des conteneurs perfectgeneration (qui fonctionnent):"
echo ""

for container in perfectgenerations-frontend perfectgenerations-backend perfectgenerations-frontadmin; do
    if docker ps --format "{{.Names}}" | grep -q "$container"; then
        echo "=== $container ==="
        docker inspect "$container" --format='{{range .Config.Labels}}{{.}}{{"\n"}}{{end}}' 2>/dev/null | grep -E "traefik.*certresolver|traefik.*entrypoint" | head -5
        echo ""
    fi
done

echo "2. Configuration Traefik (certificat resolvers):"
TRAEFIK_CONTAINER=$(docker ps --format "{{.Names}}" | grep traefik | head -1)
if [ -n "$TRAEFIK_CONTAINER" ]; then
    echo "Conteneur: $TRAEFIK_CONTAINER"
    echo ""
    echo "Recherche dans les logs:"
    docker logs "$TRAEFIK_CONTAINER" 2>&1 | grep -i "certificatesresolvers\|certresolver" | head -10 || echo "Aucun log trouvé"
    echo ""
    echo "Recherche dans les fichiers de configuration:"
    docker exec "$TRAEFIK_CONTAINER" sh -c "find /etc/traefik /traefik -name '*.yml' -o -name '*.yaml' 2>/dev/null | head -5" || echo "Fichiers non trouvés"
fi
