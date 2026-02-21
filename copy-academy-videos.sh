#!/bin/bash

# Script pour copier les vidéos de formation depuis tmp/academy vers le container Docker
# et exécuter les seeds correspondants

# Ne pas arrêter en cas d'erreur pour continuer avec les autres dossiers
set +e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="/var/www/nunaheritage"
# Le dossier tmp est à la racine système, pas dans le projet
TMP_DIR="/tmp/academy"
BACKEND_DIR="${PROJECT_DIR}/backend"
CONTAINER_NAME="nunaheritage-backend"
CONTAINER_UPLOADS_PATH="/app/uploads/academy"

# Mapping des dossiers vers les seeds
declare -A SEED_MAPPING=(
  ["charisme"]="seed:charisme"
  ["gestion des emotion"]="seed:gestion-emotions"
  ["gestion des emotions"]="seed:gestion-emotions"
  ["tressage coquillage"]="seed:tressage-coquillage"
)

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Copie des vidéos de formation${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Vérifier que le dossier tmp/academy existe
if [ ! -d "$TMP_DIR" ]; then
  echo -e "${RED}❌ Le dossier ${TMP_DIR} n'existe pas${NC}"
  exit 1
fi

# Détecter la commande Docker disponible
DOCKER_CMD=""
if command -v docker &> /dev/null; then
  DOCKER_CMD="docker"
elif command -v podman &> /dev/null; then
  DOCKER_CMD="podman"
else
  echo -e "${RED}❌ Aucune commande Docker/Podman trouvée${NC}"
  exit 1
fi

# Vérifier que le container Docker existe et est en cours d'exécution
if ! $DOCKER_CMD ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo -e "${RED}❌ Le container ${CONTAINER_NAME} n'est pas en cours d'exécution${NC}"
  echo -e "${YELLOW}💡 Essayez: docker-compose up -d backend${NC}"
  exit 1
fi

# Fonction pour copier un dossier dans le container
copy_to_container() {
  local source_dir="$1"
  local dest_dir="$2"
  local folder_name=$(basename "$source_dir")
  
  echo -e "\n${BLUE}📦 Copie de ${folder_name}...${NC}"
  
  # Créer le dossier de destination dans le container s'il n'existe pas
  $DOCKER_CMD exec "$CONTAINER_NAME" mkdir -p "$dest_dir"
  
  # Copier le dossier dans le container
  echo -e "${YELLOW}  → Copie en cours...${NC}"
  $DOCKER_CMD cp "$source_dir" "${CONTAINER_NAME}:${dest_dir}/"
  
  # Vérifier que la copie a réussi
  if $DOCKER_CMD exec "$CONTAINER_NAME" test -d "${dest_dir}/${folder_name}"; then
    echo -e "${GREEN}  ✓ Copie réussie${NC}"
    return 0
  else
    echo -e "${RED}  ✗ Échec de la copie${NC}"
    return 1
  fi
}

# Fonction pour supprimer un dossier de tmp
remove_from_tmp() {
  local folder_path="$1"
  local folder_name=$(basename "$folder_path")
  
  echo -e "${YELLOW}  🗑️  Suppression de ${folder_name} depuis tmp...${NC}"
  
  if rm -rf "$folder_path"; then
    echo -e "${GREEN}  ✓ Suppression réussie${NC}"
    return 0
  else
    echo -e "${RED}  ✗ Échec de la suppression${NC}"
    return 1
  fi
}

# Fonction pour exécuter un seed
run_seed() {
  local seed_command="$1"
  local folder_name="$2"
  
  echo -e "\n${BLUE}🌱 Exécution du seed pour ${folder_name}...${NC}"
  
  # Exécuter le seed dans le container
  if $DOCKER_CMD exec -w /app "$CONTAINER_NAME" npm run "$seed_command"; then
    echo -e "${GREEN}  ✓ Seed exécuté avec succès${NC}"
    return 0
  else
    echo -e "${RED}  ✗ Échec de l'exécution du seed${NC}"
    return 1
  fi
}

# Fonction pour traiter un dossier de formation
process_formation() {
  local folder_path="$1"
  local folder_name=$(basename "$folder_path")
  
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}📚 Traitement de: ${folder_name}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  
  # Normaliser le nom du dossier pour la recherche du seed
  local normalized_name=$(echo "$folder_name" | tr '[:upper:]' '[:lower:]')
  local seed_command="${SEED_MAPPING[$normalized_name]}"
  
  if [ -z "$seed_command" ]; then
    echo -e "${YELLOW}  ⚠ Aucun seed trouvé pour ${folder_name}, copie uniquement${NC}"
    seed_command=""
  fi
  
  # Étape 1: Copier dans le container
  if ! copy_to_container "$folder_path" "$CONTAINER_UPLOADS_PATH"; then
    echo -e "${RED}❌ Échec de la copie, passage au dossier suivant${NC}"
    return 1
  fi
  
  # Étape 2: Supprimer de tmp
  if ! remove_from_tmp "$folder_path"; then
    echo -e "${YELLOW}⚠ La copie a réussi mais la suppression a échoué${NC}"
    echo -e "${YELLOW}  Vous pouvez supprimer manuellement: ${folder_path}${NC}"
  fi
  
  # Étape 3: Exécuter le seed si disponible
  if [ -n "$seed_command" ]; then
    if ! run_seed "$seed_command" "$folder_name"; then
      echo -e "${YELLOW}⚠ La copie a réussi mais le seed a échoué${NC}"
      echo -e "${YELLOW}  Vous pouvez exécuter manuellement: $DOCKER_CMD exec -w /app ${CONTAINER_NAME} npm run ${seed_command}${NC}"
    fi
  fi
  
  echo -e "${GREEN}✅ Traitement de ${folder_name} terminé${NC}"
  return 0
}

# Lister tous les dossiers dans tmp/academy
echo -e "${BLUE}🔍 Recherche des dossiers de formation...${NC}\n"

folders_found=0
for folder in "$TMP_DIR"/*; do
  if [ -d "$folder" ]; then
    folders_found=$((folders_found + 1))
  fi
done

if [ $folders_found -eq 0 ]; then
  echo -e "${YELLOW}⚠ Aucun dossier trouvé dans ${TMP_DIR}${NC}"
  exit 0
fi

echo -e "${GREEN}✓ ${folders_found} dossier(s) trouvé(s)${NC}\n"

# Traiter chaque dossier un par un
for folder in "$TMP_DIR"/*; do
  if [ -d "$folder" ]; then
    process_formation "$folder"
    result=$?
    
    if [ $result -ne 0 ]; then
      echo -e "${YELLOW}⚠ Le traitement de $(basename "$folder") a rencontré des problèmes, mais on continue...${NC}"
    fi
    
    # Pause entre les dossiers pour libérer de l'espace
    echo -e "\n${YELLOW}⏸️  Pause avant le prochain dossier...${NC}"
    sleep 2
  fi
done

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Tous les dossiers ont été traités${NC}"
echo -e "${GREEN}========================================${NC}\n"
