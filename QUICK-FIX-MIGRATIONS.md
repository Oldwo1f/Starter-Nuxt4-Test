# 🚨 Correction Rapide: Migrations Manquantes

## Problème

Vous avez l'erreur: `column User.paidAccessExpiresAt does not exist` au login.

Cela signifie que les migrations suivantes n'ont pas été appliquées:
- ❌ `accessLevel` dans `goodies`
- ❌ `accessLevel` dans `courses`
- ❌ `paidAccessExpiresAt` dans `users`
- ❌ Table `bank_transfer_payments`

## Solution Rapide

### Option 1: Script Automatique (Recommandé)

```bash
# Appliquer toutes les migrations manquantes
./apply-missing-migrations.sh
```

Ce script applique directement les migrations SQL depuis les fichiers dans `backend/migrations/`.

### Option 2: Via le Conteneur Backend

Si le conteneur backend est en cours d'exécution:

```bash
# Migration accessLevel dans goodies
docker exec -i nunaheritage-backend npm run migrate:access-level

# Migration accessLevel dans courses
docker exec -i nunaheritage-backend npm run migrate:access-level-courses

# Migration paidAccessExpiresAt et bank_transfer_payments
docker exec -i nunaheritage-backend npm run migrate:bank-transfer-payments
```

### Option 3: SQL Direct

Si vous préférez exécuter directement les fichiers SQL:

```bash
# Charger les variables d'environnement
source .env

# Migration accessLevel dans goodies
docker exec -e PGPASSWORD="$DB_PASSWORD" -i nunaheritage-postgres \
    psql -U "$DB_USERNAME" -d "$DB_NAME" < backend/migrations/update_goodies_access_level.sql

# Migration accessLevel dans courses
docker exec -e PGPASSWORD="$DB_PASSWORD" -i nunaheritage-postgres \
    psql -U "$DB_USERNAME" -d "$DB_NAME" < backend/migrations/add_access_level_to_courses.sql

# Migration paidAccessExpiresAt et bank_transfer_payments
docker exec -e PGPASSWORD="$DB_PASSWORD" -i nunaheritage-postgres \
    psql -U "$DB_USERNAME" -d "$DB_NAME" < backend/migrations/add_paid_access_and_bank_transfer_payments.sql
```

## Vérification

Après avoir appliqué les migrations, vérifiez que tout est correct:

```bash
./check-migrations-status.sh
```

Vous devriez voir:
- ✅ Colonne goodies.accessLevel existe
- ✅ Colonne courses.accessLevel existe
- ✅ Colonne users.paidAccessExpiresAt existe
- ✅ Table bank_transfer_payments existe

## Redémarrer le Backend

Après avoir appliqué les migrations, redémarrez le backend pour qu'il prenne en compte les changements:

```bash
docker-compose restart backend
```

Ou si vous utilisez docker compose (sans tiret):

```bash
docker compose restart backend
```

## Test

Testez la connexion pour vérifier que l'erreur est résolue:

```bash
# Vérifier les logs du backend
docker-compose logs -f backend
```

L'erreur `column User.paidAccessExpiresAt does not exist` ne devrait plus apparaître.
