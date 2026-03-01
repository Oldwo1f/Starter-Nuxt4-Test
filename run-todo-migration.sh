#!/bin/bash

# Script pour exécuter la migration todos en local

# Charger les variables d'environnement depuis le .env du backend si disponible
if [ -f "backend/.env" ]; then
  export $(cat backend/.env | grep -v '^#' | xargs)
fi

# Valeurs par défaut si non définies
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USERNAME=${DB_USERNAME:-postgres}
DB_PASSWORD=${DB_PASSWORD:-postgres}
DB_NAME=${DB_NAME:-nunaheritage}

echo "Exécution de la migration todos..."
echo "Base de données: $DB_NAME sur $DB_HOST:$DB_PORT"
echo "Utilisateur: $DB_USERNAME"
echo ""

# Exécuter la migration
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -f backend/migrations/create_todos_table.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration exécutée avec succès !"
else
  echo ""
  echo "❌ Erreur lors de l'exécution de la migration"
  exit 1
fi
