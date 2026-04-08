#!/bin/sh
# =============================================================================
# Migrations du gros commit (partenaires / goodies / admin / archivage / preuve virement)
# Ordre: partners+goodies, ALTER partenaires, table virements manuels, proofImageUrl, users.archivedAt
#
# Usage: ./scripts/run-commit-migrations.sh
#        npm run migrate:commit-batch
#
# Depuis la racine du repo: cd backend && npm run migrate:commit-batch
# Compatible sh (Alpine), set -e
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$BACKEND_DIR"

echo "=============================================="
echo "  Migrations — lot commit (partners / users)"
echo "=============================================="
echo ""

for migration in \
  migrate:partners-goodies-tables \
  migrate:partner-admin-fields \
  migrate:partner-description \
  migrate:manual-transfer-flow-verifications \
  migrate:manual-transfer-proof-image-url \
  migrate:user-archived-at
do
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
echo "  ✅ Lot de migrations terminé"
echo "=============================================="
