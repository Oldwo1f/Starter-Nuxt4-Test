# 🚀 Guide Post-Rebuild - Migrations et Seeds

## 📋 Étapes à suivre après un rebuild sur le serveur

### 1️⃣ Vérifier que les conteneurs sont démarrés

```bash
docker ps
```

Assurez-vous que `nunaheritage-postgres` et `nunaheritage-backend` sont en cours d'exécution.

---

### 2️⃣ Appliquer les migrations consolidées

**Option A : Script automatique (Recommandé)**

```bash
./run-consolidated-migration.sh
```

**Option B : Exécution manuelle via Docker**

```bash
# Charger les variables d'environnement
source .env

# Exécuter la migration consolidée
docker exec -e PGPASSWORD="$DB_PASSWORD" nunaheritage-postgres \
    psql -U "$DB_USERNAME" -d "$DB_NAME" \
    -f backend/migrations/consolidated_migration_2026.sql
```

**Option C : Depuis le conteneur backend**

```bash
docker exec -it nunaheritage-backend \
    psql -h nunaheritage-postgres -U postgres -d nunaheritage \
    -f /app/backend/migrations/consolidated_migration_2026.sql
```

---

### 3️⃣ Vérifier que les migrations ont été appliquées

```bash
./check-migrations-status.sh
```

Vous devriez voir :
- ✅ Table `todos` existe
- ✅ Table `stripe_payments` existe
- ✅ Table `legacy_payment_verifications` existe
- ✅ Colonne `listings.isSearching` existe

---

### 4️⃣ Ajouter les todos (seed sécurisé)

**⚠️ IMPORTANT : Utilisez la version SÉCURISÉE qui ne supprime rien**

```bash
# Depuis le conteneur backend
docker exec -it nunaheritage-backend npm run seed:todos-safe
```

**Ce script :**
- ✅ Ne supprime AUCUNE donnée existante
- ✅ Ajoute uniquement les todos qui n'existent pas déjà
- ✅ Vérifie l'existence avant d'ajouter (basé sur le titre)

---

### 5️⃣ Vérification finale

```bash
# Vérifier que les todos ont été créés
docker exec -e PGPASSWORD="$DB_PASSWORD" nunaheritage-postgres \
    psql -U "$DB_USERNAME" -d "$DB_NAME" \
    -c "SELECT COUNT(*) as total_todos FROM todos;"
```

---

## 📝 Checklist complète

- [ ] Conteneurs Docker démarrés
- [ ] Migration consolidée exécutée (`consolidated_migration_2026.sql`)
- [ ] Vérification des migrations réussie
- [ ] Todos ajoutés avec `seed:todos-safe`
- [ ] Vérification finale des todos

---

## ⚠️ Rappels importants

### ❌ NE JAMAIS exécuter sur le serveur :

```bash
# ❌ NE PAS FAIRE - Supprime des données !
npm run seed
./run-seeds.sh
```

### ✅ Utiliser uniquement :

```bash
# ✅ Version sécurisée pour les todos
npm run seed:todos-safe

# ✅ Migrations SQL consolidées
./run-consolidated-migration.sh
```

---

## 🔧 En cas de problème

### Erreur de connexion à la base de données

```bash
# Vérifier que PostgreSQL est accessible
docker exec -it nunaheritage-postgres psql -U postgres -d nunaheritage -c "SELECT 1;"
```

### Migration déjà appliquée

Les migrations sont **idempotentes** - vous pouvez les réexécuter sans problème. Elles utilisent `IF NOT EXISTS` et ne créeront pas de doublons.

### Todos déjà existants

Le script `seed:todos-safe` détecte automatiquement les todos existants et les ignore. Aucun risque de doublon.

---

## 📚 Fichiers de référence

- **Migration consolidée** : `backend/migrations/consolidated_migration_2026.sql`
- **Script de migration** : `run-consolidated-migration.sh`
- **Script de vérification** : `check-migrations-status.sh`
- **Seed sécurisé** : `backend/src/database/seeds/todos.seed-safe.ts`
- **Documentation seeds** : `README-SEED-SAFE.md`
