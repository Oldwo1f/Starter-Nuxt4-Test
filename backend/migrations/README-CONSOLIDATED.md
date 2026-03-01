# Migration Consolidée - 2026

## 📋 Description

Ce script regroupe toutes les migrations de ce commit en un seul fichier SQL pour faciliter l'application sur le serveur.

## 🎯 Migrations incluses

1. **Création de la table `todos`**
   - Colonnes: id, title, description, status, assignedTo, createdAt, updatedAt
   - Contraintes: CHK_todos_status, CHK_todos_assignedTo
   - Index: IDX_todos_status, IDX_todos_assignedTo, IDX_todos_createdAt

2. **Création de la table `stripe_payments`**
   - Colonnes: id, userId, pack, amountXpf, stripeSessionId, stripePaymentIntentId, stripeCustomerId, status, paidAt, createdAt, updatedAt
   - Contraintes: CHK_stripe_payments_pack, CHK_stripe_payments_status
   - Index: IDX_stripe_payments_stripeSessionId (unique), IDX_stripe_payments_userId_createdAt, IDX_stripe_payments_status

3. **Création de la table `legacy_payment_verifications`**
   - Colonnes: id, userId, paidWith, status, pupuInscriptionReceived, createdAt, updatedAt
   - Contraintes: CHK_legacy_payment_verifications_paidWith, CHK_legacy_payment_verifications_status
   - Index: IDX_legacy_payment_verifications_userId_createdAt, IDX_legacy_payment_verifications_status_createdAt

4. **Ajout de la colonne `isSearching` à la table `listings`**
   - Type: BOOLEAN NOT NULL DEFAULT false
   - Commentaire: Flag pour les annonces "Je recherche"

5. **Restauration du rôle superadmin**
   - Met à jour le rôle de l'utilisateur `alexismomcilovic@gmail.com` en `superadmin`

## 🚀 Utilisation

### Option 1: Script automatique (Recommandé)

```bash
./run-consolidated-migration.sh
```

### Option 2: Exécution manuelle via Docker

```bash
# Charger les variables d'environnement
source .env

# Exécuter la migration
docker exec -e PGPASSWORD="$DB_PASSWORD" nunaheritage-postgres \
    psql -U "$DB_USERNAME" -d "$DB_NAME" \
    -f backend/migrations/consolidated_migration_2026.sql
```

### Option 3: Exécution directe (si PostgreSQL est accessible localement)

```bash
# Charger les variables d'environnement
source .env

# Exécuter la migration
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" \
    -U "$DB_USERNAME" -d "$DB_NAME" \
    -f backend/migrations/consolidated_migration_2026.sql
```

## ✅ Vérification

Le script inclut des vérifications automatiques qui s'exécutent à la fin pour s'assurer que:
- Toutes les tables ont été créées
- La colonne `isSearching` existe dans `listings`

Si une erreur survient, le script s'arrêtera et la transaction sera annulée (ROLLBACK automatique).

## 🔄 Idempotence

Ce script est **idempotent** et peut être exécuté plusieurs fois sans erreur. Il utilise:
- `CREATE TABLE IF NOT EXISTS` pour les tables
- `ADD COLUMN IF NOT EXISTS` pour les colonnes
- `DROP CONSTRAINT IF EXISTS` avant de recréer les contraintes
- Vérifications d'existence pour les index

## ⚠️ Notes importantes

- Le script utilise une transaction (`BEGIN`/`COMMIT`) pour garantir l'intégrité
- Si une erreur survient, toutes les modifications seront annulées
- Les vérifications finales garantissent que toutes les migrations ont été appliquées correctement
- Le script restaure le rôle superadmin pour `alexismomcilovic@gmail.com` à chaque exécution

## 📝 Fichiers source

Ce script consolidé regroupe les migrations suivantes:
- `backend/migrations/create_todos_table.sql`
- `backend/migrations/create_stripe_payments_table.sql`
- `backend/migrations/create_legacy_payment_verifications_table.sql`
- `backend/migrations/add_is_searching_to_listings.sql`
- `backend/migrations/restore-superadmin-role.sql`
