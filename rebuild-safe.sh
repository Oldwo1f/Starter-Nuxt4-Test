#!/bin/bash

# Script de rebuild sécurisé des conteneurs Docker
# Préserve les volumes et les données de la base de données

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Rebuild sécurisé des conteneurs Docker${NC}"
echo ""

# Vérifier Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi

# Demander confirmation
echo -e "${YELLOW}⚠️  Ce script va:${NC}"
echo "  1. Créer une sauvegarde de la base de données (optionnel mais recommandé)"
echo "  2. Arrêter les conteneurs (SANS supprimer les volumes)"
echo "  3. Reconstruire les images"
echo "  4. Redémarrer les conteneurs"
echo ""
read -p "Voulez-vous créer une sauvegarde avant le rebuild? (o/N): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[OoYy]$ ]]; then
    if [ -f "./backup-database.sh" ]; then
        echo -e "${GREEN}💾 Création de la sauvegarde...${NC}"
        ./backup-database.sh "pre-rebuild_$(date +%Y%m%d_%H%M%S)"
    else
        echo -e "${YELLOW}⚠️  Script de sauvegarde non trouvé, continuation sans sauvegarde${NC}"
    fi
fi

echo ""
echo -e "${GREEN}🛑 Arrêt des conteneurs (volumes préservés)...${NC}"
# IMPORTANT: Pas de flag -v pour préserver les volumes
$DOCKER_COMPOSE_CMD down

echo ""
echo -e "${GREEN}📦 Reconstruction des images...${NC}"
$DOCKER_COMPOSE_CMD build --no-cache

echo ""
echo -e "${GREEN}🚀 Démarrage des services...${NC}"
$DOCKER_COMPOSE_CMD up -d

echo ""
echo -e "${GREEN}⏳ Attente du démarrage des services...${NC}"
sleep 10

echo ""
echo -e "${GREEN}📊 État des conteneurs:${NC}"
$DOCKER_COMPOSE_CMD ps

echo ""
echo -e "${GREEN}✅ Rebuild terminé!${NC}"
echo ""

# Vérifier et appliquer les migrations si nécessaire
echo -e "${BLUE}🔄 Vérification des migrations de la base de données...${NC}"
if [ -f "./check-migrations-status.sh" ]; then
    if ! ./check-migrations-status.sh; then
        echo ""
        echo -e "${YELLOW}⚠️  Certaines migrations sont manquantes${NC}"
        read -p "Voulez-vous les appliquer maintenant? (O/n): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            if [ -f "./apply-migrations-safe.sh" ]; then
                ./apply-migrations-safe.sh
            else
                echo -e "${YELLOW}⚠️  Script d'application des migrations non trouvé${NC}"
                echo "Exécutez manuellement: ./run-all-migrations.sh"
            fi
        fi
    else
        echo -e "${GREEN}✅ Toutes les migrations sont à jour!${NC}"
    fi
    echo ""
fi

echo -e "${BLUE}💡 Vérification des volumes:${NC}"
if [ -f "./verify-volumes.sh" ]; then
    ./verify-volumes.sh
fi
