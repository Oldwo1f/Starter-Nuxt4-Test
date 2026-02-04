#!/bin/bash

# Script to fix listings table before TypeORM synchronize
# This fixes existing data to prevent migration errors

echo "🔧 Fixing listings table..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Please create it from env.example"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Default values
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USERNAME=${DB_USERNAME:-postgres}
DB_NAME=${DB_NAME:-nunaheritage}

echo "📊 Connecting to database: $DB_NAME on $DB_HOST:$DB_PORT"

# Run the migration SQL
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -d "$DB_NAME" -f migrations/fix_listings_price_before_sync.sql

if [ $? -eq 0 ]; then
    echo "✅ Listings table fixed successfully!"
    echo "🚀 You can now start the backend server"
else
    echo "❌ Error fixing listings table"
    exit 1
fi
