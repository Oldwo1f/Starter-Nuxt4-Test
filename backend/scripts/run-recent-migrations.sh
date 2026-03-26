#!/bin/sh
# =============================================================================
# Script pour exécuter uniquement les migrations récentes
# Usage: ./scripts/run-recent-migrations.sh
# Ou: npm run migrate:recent
# Compatible Alpine (sh only, pas de bash)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_DIR"

echo "=============================================="
echo "  Exécution des migrations récentes"
echo "=============================================="
echo ""

# Nouvelles migrations à appliquer
for migration in migrate:launch-mode migrate:user-premium-lifetime-stripe migrate:site-banner-config; do
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
echo "  ✅ Migrations récentes exécutées"
echo "=============================================="

