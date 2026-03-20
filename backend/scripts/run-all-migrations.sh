#!/bin/sh
# =============================================================================
# Script pour exécuter toutes les migrations de la base de données
# Usage: ./scripts/run-all-migrations.sh
# Ou depuis Docker: docker exec nunaheritage-backend npm run migrate:all
# Compatible Alpine (sh only, pas de bash)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_DIR"

echo "=============================================="
echo "  Exécution de toutes les migrations"
echo "=============================================="
echo ""

# Liste des migrations dans l'ordre des dépendances (idempotentes, safe to re-run)
for migration in migrate:consolidated migrate:video-url migrate:fileurl-goodies migrate:access-level migrate:access-level-courses migrate:bank-transfer-payments migrate:stripe-payments migrate:te-natiraa-registrations migrate:te-natiraa-events migrate:legacy-verifications migrate:polls migrate:conversations-messages migrate:is-certified migrate:blog-status migrate:kikiri migrate:kikiri-config migrate:kikiri-betting-duration migrate:kikiri-post-resolution-delay migrate:bingo migrate:bingo-fix-roundid migrate:bingo-grid-price migrate:bingo-winner-ids migrate:jiji migrate:game-period-winners migrate:bingo-ended-at; do
  echo ">>> $migration"
  if npm run "$migration"; then
    echo ""
  else
    echo ""
    echo "❌ Échec de la migration: $migration"
    exit 1
  fi
done

echo "=============================================="
echo "  ✅ Toutes les migrations ont été exécutées"
echo "=============================================="
