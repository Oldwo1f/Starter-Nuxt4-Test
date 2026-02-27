# 🔄 Guide des Migrations de Base de Données

## ⚠️ IMPORTANT: Migrations et Rebuild

Lors d'un rebuild des conteneurs Docker, **les données persistent** grâce aux volumes Docker, mais **les migrations doivent être vérifiées et appliquées** si nécessaire.

## 🔍 Vérifier l'État des Migrations

Avant et après un rebuild, vérifiez l'état des migrations:

```bash
./check-migrations-status.sh
```

Ce script vérifie que toutes les migrations importantes sont appliquées:
- ✅ Colonne `fileUrl` dans `goodies`
- ✅ Colonne `accessLevel` dans `goodies` (remplace `isPublic`)
- ✅ Colonne `accessLevel` dans `courses`
- ✅ Colonne `paidAccessExpiresAt` dans `users`
- ✅ Table `bank_transfer_payments` avec toutes ses colonnes
- ✅ Colonne `videoUrl` dans `videos`

## 🔄 Appliquer les Migrations

Si des migrations sont manquantes, appliquez-les de manière sécurisée:

```bash
./apply-migrations-safe.sh
```

Ce script:
1. Crée une sauvegarde préventive (optionnel)
2. Vérifie l'état actuel
3. Applique les migrations manquantes
4. Vérifie que tout est correct

## 📋 Migrations Disponibles

### Migrations SQL (via scripts)

Les migrations SQL sont dans `backend/migrations/`:

1. **add_fileurl_to_goodies.sql** - Ajoute `fileUrl` à `goodies`
2. **update_goodies_access_level.sql** - Remplace `isPublic` par `accessLevel` dans `goodies`
3. **add_access_level_to_courses.sql** - Ajoute `accessLevel` à `courses`
4. **add_paid_access_and_bank_transfer_payments.sql** - Ajoute `paidAccessExpiresAt` et crée `bank_transfer_payments`
5. **fix_course_progress_table.sql** - Corrige la structure de `course_progress`

### Migrations TypeScript (via npm scripts)

Les migrations TypeScript sont exécutées depuis le conteneur backend:

```bash
# Depuis le conteneur backend
docker exec -it nunaheritage-backend npm run migrate:fileurl-goodies
docker exec -it nunaheritage-backend npm run migrate:access-level
docker exec -it nunaheritage-backend npm run migrate:access-level-courses
docker exec -it nunaheritage-backend npm run migrate:bank-transfer-payments
docker exec -it nunaheritage-backend npm run migrate:video-url
```

## 🔄 Processus Complet de Rebuild avec Migrations

```bash
# 1. Sauvegarde préventive
./backup-database.sh

# 2. Vérifier l'état actuel des migrations
./check-migrations-status.sh

# 3. Rebuild sécurisé (inclut vérification des migrations)
./rebuild-safe.sh

# OU manuellement:
docker-compose down          # ⚠️ SANS -v
docker-compose build --no-cache
docker-compose up -d

# 4. Vérifier les migrations après rebuild
./check-migrations-status.sh

# 5. Appliquer les migrations si nécessaire
./apply-migrations-safe.sh
```

## 🛡️ Sécurité des Migrations

### Idempotence

La plupart des migrations sont **idempotentes** (peuvent être exécutées plusieurs fois sans erreur):
- Utilisent `IF NOT EXISTS` pour les colonnes
- Utilisent `CREATE TABLE IF NOT EXISTS` pour les tables
- Vérifient l'existence avant de modifier

### Exemples de Migrations Idempotentes

```sql
-- ✅ Idempotent
ALTER TABLE goodies ADD COLUMN IF NOT EXISTS "fileUrl" VARCHAR NULL;

-- ✅ Idempotent
CREATE TABLE IF NOT EXISTS bank_transfer_payments (...);

-- ✅ Idempotent (avec vérification)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'paidAccessExpiresAt'
  ) THEN
    ALTER TABLE users ADD COLUMN "paidAccessExpiresAt" TIMESTAMP NULL;
  END IF;
END $$;
```

## ⚠️ Migrations Non-Idempotentes

Certaines migrations peuvent ne pas être idempotentes si elles:
- Suppriment des colonnes (comme `isPublic` → `accessLevel`)
- Modifient des données existantes
- Changent des types de colonnes

Ces migrations doivent être exécutées **une seule fois** et sont généralement gérées par le script `update_goodies_access_level.sql` qui vérifie l'état avant de migrer.

## 🔍 Dépannage

### Erreur: "column already exists"

C'est normal si la migration est idempotente. La colonne existe déjà, la migration est ignorée.

### Erreur: "table does not exist"

Vérifiez que TypeORM a créé les tables de base. En production, `synchronize: false`, donc les tables doivent être créées via les migrations ou les seeds.

### Migration partielle

Si une migration échoue en cours d'exécution:
1. Vérifiez l'état avec `./check-migrations-status.sh`
2. Restaurez la sauvegarde si nécessaire
3. Corrigez le problème et réessayez

## 📝 Notes Importantes

1. **TypeORM synchronize**: En production, `synchronize: false` pour des raisons de sécurité
2. **Migrations manuelles**: Les migrations doivent être exécutées manuellement
3. **Ordre d'exécution**: Certaines migrations dépendent d'autres (vérifiez les dépendances)
4. **Sauvegarde**: Toujours faire une sauvegarde avant des migrations importantes
5. **Test en local**: Tester les migrations en local avant de les appliquer en production

## 🎯 Checklist Avant/Après Rebuild

### Avant le Rebuild
- [ ] ✅ Sauvegarde de la base de données: `./backup-database.sh`
- [ ] 🔍 Vérification de l'état des migrations: `./check-migrations-status.sh`
- [ ] 📝 Note des migrations manquantes (si applicable)

### Après le Rebuild
- [ ] 🔍 Vérification de l'état des migrations: `./check-migrations-status.sh`
- [ ] 🔄 Application des migrations manquantes: `./apply-migrations-safe.sh`
- [ ] ✅ Vérification finale que tout fonctionne
- [ ] 🧪 Test de l'application

## 🆘 En Cas de Problème

1. **Restaurez la sauvegarde** si les migrations ont causé des problèmes
2. **Vérifiez les logs** du conteneur backend: `docker-compose logs backend`
3. **Vérifiez les logs** PostgreSQL: `docker-compose logs postgres`
4. **Consultez les migrations** dans `backend/migrations/` pour comprendre les changements
