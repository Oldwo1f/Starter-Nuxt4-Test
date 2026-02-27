#!/bin/bash

# Script pour appliquer toutes les migrations de manière sécurisée
# Avec sauvegarde préventive et vérification

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔄 Application sécurisée des migrations${NC}"
echo ""

# Charger les variables d'environnement
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Vérifier Docker Compose
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    exit 1
fi

CONTAINER_BACKEND="nunaheritage-backend"
CONTAINER_POSTGRES="nunaheritage-postgres"

# Vérifier que les conteneurs sont en cours d'exécution
if ! docker ps | grep -q "$CONTAINER_POSTGRES"; then
    echo -e "${RED}❌ Le conteneur PostgreSQL n'est pas en cours d'exécution${NC}"
    echo "Démarrez-le avec: $DOCKER_COMPOSE_CMD up -d postgres"
    exit 1
fi

# Étape 1: Sauvegarde préventive
echo -e "${YELLOW}📦 Étape 1: Sauvegarde préventive${NC}"
if [ -f "./backup-database.sh" ]; then
    read -p "Voulez-vous créer une sauvegarde avant d'appliquer les migrations? (O/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        ./backup-database.sh "pre-migration_$(date +%Y%m%d_%H%M%S)"
        echo ""
    fi
else
    echo -e "${YELLOW}⚠️  Script de sauvegarde non trouvé, continuation sans sauvegarde${NC}"
    echo ""
fi

# Étape 2: Vérifier l'état actuel
echo -e "${YELLOW}📊 Étape 2: Vérification de l'état actuel${NC}"
if [ -f "./check-migrations-status.sh" ]; then
    ./check-migrations-status.sh || echo -e "${YELLOW}⚠️  Certaines migrations sont manquantes, nous allons les appliquer${NC}"
    echo ""
fi

# Étape 3: Appliquer les migrations
echo -e "${YELLOW}🔄 Étape 3: Application des migrations${NC}"

# D'abord, exécuter run-all-migrations.sh pour les migrations de base
if [ -f "./run-all-migrations.sh" ]; then
    echo "Exécution de run-all-migrations.sh (migrations de base)..."
    ./run-all-migrations.sh
    echo ""
fi

# Ensuite, appliquer les migrations manquantes via SQL direct
if [ -f "./apply-missing-migrations.sh" ]; then
    echo "Application des migrations manquantes (accessLevel, paidAccessExpiresAt, bank_transfer_payments)..."
    ./apply-missing-migrations.sh
    echo ""
else
    echo -e "${YELLOW}⚠️  Script apply-missing-migrations.sh non trouvé${NC}"
    echo "Tentative d'application via le conteneur backend..."
    
    if docker ps | grep -q "$CONTAINER_BACKEND"; then
        echo "Migration: accessLevel dans goodies..."
        docker exec -i "$CONTAINER_BACKEND" npm run migrate:access-level 2>&1 || echo -e "${YELLOW}⚠️  Migration access-level déjà appliquée ou erreur${NC}"
        
        echo "Migration: accessLevel dans courses..."
        docker exec -i "$CONTAINER_BACKEND" npm run migrate:access-level-courses 2>&1 || echo -e "${YELLOW}⚠️  Migration access-level-courses déjà appliquée ou erreur${NC}"
        
        echo "Migration: bank transfer payments..."
        docker exec -i "$CONTAINER_BACKEND" npm run migrate:bank-transfer-payments 2>&1 || echo -e "${YELLOW}⚠️  Migration bank-transfer-payments déjà appliquée ou erreur${NC}"
    else
        echo -e "${YELLOW}⚠️  Le conteneur backend n'est pas en cours d'exécution${NC}"
        echo "Les migrations seront appliquées via SQL direct si les fichiers existent"
    fi
    echo ""
fi

# Étape 4: Vérification finale
echo -e "${YELLOW}✅ Étape 4: Vérification finale${NC}"
if [ -f "./check-migrations-status.sh" ]; then
    if ./check-migrations-status.sh; then
        echo ""
        echo -e "${GREEN}✅ Toutes les migrations ont été appliquées avec succès!${NC}"
    else
        echo ""
        echo -e "${YELLOW}⚠️  Certaines migrations peuvent nécessiter une attention particulière${NC}"
        echo "Vérifiez les erreurs ci-dessus et réessayez si nécessaire."
    fi
else
    echo -e "${YELLOW}⚠️  Script de vérification non trouvé${NC}"
fi
