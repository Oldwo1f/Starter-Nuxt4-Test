# Migrations SQL

Ce dossier contient les scripts SQL de migration pour la base de données.

## Ordre d'exécution

### 1. Avant de démarrer le backend (si vous avez des données existantes)

Si vous avez des listings existants dans la base de données, exécutez d'abord :

```bash
psql -U postgres -d nunaheritage -f migrations/fix_listings_price_before_sync.sql
```

Ce script :
- Corrige les prix NULL
- Arrondit les prix décimaux en entiers
- Ajoute la colonne priceUnit
- Définit des valeurs par défaut pour priceUnit

### 2. Après la synchronisation TypeORM

Une fois que TypeORM a synchronisé le schéma (changement de price en integer), vous pouvez exécuter :

```bash
psql -U postgres -d nunaheritage -f migrations/add_price_unit_to_listings.sql
```

**Note** : En développement, TypeORM avec `synchronize: true` appliquera automatiquement les changements. Ces migrations sont principalement pour la production ou pour corriger des données existantes.

## Réinitialisation complète

Si vous voulez repartir de zéro :

```bash
# Supprimer toutes les données
psql -U postgres -d nunaheritage -c "TRUNCATE TABLE listings CASCADE;"

# Relancer les seeds
cd backend
npm run seed
```
