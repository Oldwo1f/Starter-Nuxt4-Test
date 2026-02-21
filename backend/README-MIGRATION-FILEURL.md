# Migration : Ajout de la colonne fileUrl à la table goodies

Cette migration ajoute la colonne `fileUrl` à la table `goodies` pour permettre l'upload de fichiers (zip, pdf, etc.).

## 🔍 Problème

En production, TypeORM a `synchronize: false` pour des raisons de sécurité. Cela signifie que TypeORM ne modifie **pas** automatiquement les tables existantes. Seules les nouvelles tables sont créées.

Si vous avez une table `goodies` existante sans la colonne `fileUrl`, vous devez exécuter cette migration manuellement.

## 🚀 Solution

### Option 1 : Exécuter dans le container Docker (Recommandé)

```bash
# Depuis le répertoire racine du projet
cd /var/www/nunaheritage

# Exécuter la migration dans le container backend
docker exec -w /app nunaheritage-backend npm run migrate:fileurl-goodies
```

### Option 2 : Exécuter depuis l'hôte (si vous avez accès direct à la DB)

```bash
cd /var/www/nunaheritage/backend
./run-migration-fileurl.sh
```

### Option 3 : Exécuter directement avec psql

```bash
# Depuis le répertoire backend
psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME -f migrations/add_fileurl_to_goodies.sql
```

Ou depuis le container :

```bash
docker exec -i nunaheritage-postgres psql -U postgres -d nunaheritage < backend/migrations/add_fileurl_to_goodies.sql
```

## ✅ Vérification

Après avoir exécuté la migration, vérifiez que la colonne existe :

```bash
# Depuis le container postgres
docker exec -it nunaheritage-postgres psql -U postgres -d nunaheritage -c "\d goodies"
```

Vous devriez voir la colonne `fileUrl` dans la liste des colonnes.

## 📝 Notes

- La migration utilise `ADD COLUMN IF NOT EXISTS`, donc elle est idempotente (peut être exécutée plusieurs fois sans erreur)
- La colonne est nullable (`NULL`)
- Si `fileUrl` est défini, il prend la priorité sur le champ `link`
