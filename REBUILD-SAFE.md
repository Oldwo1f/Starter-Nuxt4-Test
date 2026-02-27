# 🔒 Guide de Rebuild Sécurisé - Protection des Données

## ⚠️ IMPORTANT: Préserver les Données de la Base de Données

Lors d'un rebuild des conteneurs Docker, **les volumes Docker sont préservés** si vous utilisez les bonnes commandes.

## ✅ Commandes SÉCURISÉES (préserve les données)

```bash
# Option 1: Utiliser le script de rebuild sécurisé (RECOMMANDÉ)
./rebuild-safe.sh

# Option 2: Commandes manuelles
docker-compose down          # ⚠️ SANS le flag -v
docker-compose build --no-cache
docker-compose up -d
```

## ❌ Commandes DANGEREUSES (supprime les données)

```bash
# ⚠️ NE JAMAIS UTILISER ces commandes en production!
docker-compose down -v       # ❌ Supprime les volumes = PERTE DE DONNÉES
docker-compose down --volumes # ❌ Supprime les volumes = PERTE DE DONNÉES
docker volume rm <volume_name> # ❌ Supprime un volume spécifique
```

## 📦 Volumes Docker Configurés

Votre `docker-compose.yml` définit deux volumes persistants:

1. **`postgres_data`** → Stocke toutes les données PostgreSQL
   - Monté sur: `/var/lib/postgresql/data` dans le conteneur
   - **C'est ici que sont vos données de base de données!**

2. **`backend_uploads`** → Stocke les fichiers uploadés
   - Monté sur: `/app/uploads` dans le conteneur backend

## 💾 Sauvegarde Préventive (Recommandé)

Avant un rebuild important, créez une sauvegarde:

```bash
# Sauvegarde automatique avec timestamp
./backup-database.sh

# Sauvegarde avec nom personnalisé
./backup-database.sh backup_avant_rebuild_2024
```

Les sauvegardes sont stockées dans `./backups/`

## 🔍 Vérifier les Volumes

Pour vérifier que vos volumes existent et sont intacts:

```bash
./verify-volumes.sh
```

## 📋 Checklist Avant un Rebuild

- [ ] ✅ Vérifier que les volumes existent: `./verify-volumes.sh`
- [ ] 💾 Créer une sauvegarde: `./backup-database.sh` (recommandé)
- [ ] 🔍 Vérifier l'état des migrations: `./check-migrations-status.sh`
- [ ] 🔧 Utiliser `docker-compose down` **SANS** le flag `-v`
- [ ] 🚀 Reconstruire: `docker-compose build --no-cache`
- [ ] ▶️ Redémarrer: `docker-compose up -d`
- [ ] 🔍 Vérifier les migrations après rebuild: `./check-migrations-status.sh`
- [ ] 🔄 Appliquer les migrations si nécessaire: `./apply-migrations-safe.sh`
- [ ] ✅ Vérifier que les données sont toujours présentes

## 🔄 Processus de Rebuild Complet

```bash
# 1. Sauvegarde (optionnel mais recommandé)
./backup-database.sh

# 2. Vérifier les volumes
./verify-volumes.sh

# 3. Vérifier l'état des migrations AVANT le rebuild
./check-migrations-status.sh

# 4. Rebuild sécurisé (utilise le script ou les commandes manuelles)
./rebuild-safe.sh

# OU manuellement:
docker-compose down          # ⚠️ SANS -v
docker-compose build --no-cache
docker-compose up -d

# 5. Vérifier les migrations APRÈS le rebuild
./check-migrations-status.sh

# 6. Appliquer les migrations si nécessaire
./apply-migrations-safe.sh

# 7. Vérifier que tout fonctionne
docker-compose ps
docker-compose logs -f
```

## 🔄 Migrations de Base de Données

⚠️ **IMPORTANT**: Après un rebuild, vérifiez toujours que les migrations sont appliquées!

Les migrations sont **séparées des données**. Même si vos données persistent (volumes Docker), les migrations doivent être vérifiées et appliquées si nécessaire.

Voir le guide complet: `MIGRATIONS-GUIDE.md`

## 🆘 Restauration d'une Sauvegarde

Si vous avez besoin de restaurer une sauvegarde:

```bash
# Charger les variables d'environnement
source .env

# Restaurer la sauvegarde
docker exec -i -e PGPASSWORD="$DB_PASSWORD" nunaheritage-postgres \
    psql -U $DB_USERNAME -d $DB_NAME < backups/backup_YYYYMMDD_HHMMSS.sql
```

## 📝 Notes Importantes

1. **Le script `deploy.sh` est sûr**: Il utilise `docker-compose down` sans `-v`
2. **Les volumes persistent** même après `docker-compose down`
3. **Les volumes ne sont supprimés** que si vous utilisez explicitement `-v` ou `--volumes`
4. **Les images Docker** sont reconstruites, mais **les volumes restent intacts**

## 🎯 Résumé Rapide

- ✅ `docker-compose down` → **SÉCURISÉ** (préserve les volumes)
- ❌ `docker-compose down -v` → **DANGEREUX** (supprime les volumes)
- 💾 Toujours faire une sauvegarde avant un gros changement
- 🔍 Vérifier les volumes avec `./verify-volumes.sh`
- 🔄 **Vérifier les migrations** avant et après le rebuild avec `./check-migrations-status.sh`
- 🔄 **Appliquer les migrations** si nécessaire avec `./apply-migrations-safe.sh`
